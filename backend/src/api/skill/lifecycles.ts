module.exports = {
  async afterDelete(event) {
    try {
      const db = strapi.db.connection;

      // 1. On réorganise les IDs
      // Note: Cela ne fonctionne que si aucune autre table n'a de Foreign Key sur skills.id
      await db.raw(`
        WITH summary AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY id) as new_id 
          FROM skills
        )
        UPDATE skills 
        SET id = summary.new_id
        FROM summary
        WHERE skills.id = summary.id;
      `);

      // 2. On récupère le max actuel
      const maxIdResult = await db('skills').max('id as maxId').first();
      const maxId = parseInt(maxIdResult?.maxId) || 0;

      // 3. On synchronise la séquence correctement
      // On met la séquence au max actuel. Le prochain insert fera automatiquement +1.
      if (maxId === 0) {
        await db.raw(`ALTER SEQUENCE skills_id_seq RESTART WITH 1`);
      } else {
        await db.raw(`SELECT setval(pg_get_serial_sequence('skills', 'id'), ?, true)`, [maxId]);
      }

      console.log(`[Skill] IDs synchronisés. Prochain ID sera: ${maxId + 1}`);
    } catch (error) {
      console.error('Erreur dans le hook afterDelete:', error);
    }
  },
};