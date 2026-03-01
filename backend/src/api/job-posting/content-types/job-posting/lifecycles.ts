/**
 * Job Posting lifecycle hooks
 * - beforeDelete: cascade-delete related candidates + their resume files
 *
 * Note: api::candidate.candidate is defined in a later sprint so we
 * use `as any` to bypass the type-system until the content-type exists.
 */
export default {
  async beforeDelete(event: any) {
    const { where } = event.params;
    const documentId = where?.documentId || where?.id;
    if (!documentId) return;

    try {
      // Find all candidates linked to this job posting
      const candidates: any[] = await (strapi.documents as any)('api::candidate.candidate').findMany({
        filters: { jobPosting: { documentId } },
        populate: ['resume'],
      });

      if (!candidates || candidates.length === 0) return;

      for (const candidate of candidates) {
        // Delete the resume file if it exists
        if (candidate.resume) {
          const fileIds = Array.isArray(candidate.resume)
            ? candidate.resume.map((f: any) => f.id)
            : [candidate.resume.id];
          for (const fid of fileIds) {
            try {
              const file = await strapi.plugins.upload.services.upload.findOne(fid);
              if (file) {
                await strapi.plugins.upload.services.upload.remove(file);
              }
            } catch (err) {
              strapi.log.warn(`Could not delete file ${fid}: ${err}`);
            }
          }
        }

        // Delete the candidate
        await (strapi.documents as any)('api::candidate.candidate').delete({
          documentId: candidate.documentId,
        });
      }

      strapi.log.info(
        `[JobPosting] Cascade-deleted ${candidates.length} candidate(s) for job posting ${documentId}.`
      );
    } catch (error) {
      strapi.log.error(`[JobPosting] Cascade deletion error: ${error}`);
    }
  },
};
