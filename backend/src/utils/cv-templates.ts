/**
 * Sprint 3: CV Template Catalog & Rendering
 * @file src/utils/cv-templates.ts
 * 
 * Contains 11 CV templates as specified in the implementation guide
 */

import type { CvTemplateKey, CvTemplateMeta, ResumeContact, ResumeContent } from './types';

// ============================================================================
// TEMPLATE CATALOG (11 templates - MUST MATCH EXACTLY)
// ============================================================================

export const CV_TEMPLATES: CvTemplateMeta[] = [
  { key: 'standard', name: 'Standard (Blue)', description: 'Clean single-column with blue accents.' },
  { key: 'experience_first', name: 'Modern (Accent Header)', description: 'Gradient header band + crisp sections.' },
  { key: 'skills_first', name: 'Two Column', description: 'Two-column layout with skill meters in sidebar.' },
  { key: 'compact', name: 'Compact', description: 'Denser spacing for longer resumes.' },
  { key: 'education_first', name: 'Minimal', description: 'Minimal, monochrome, very ATS-friendly.' },
  { key: 'project_focus', name: 'Project Focus', description: 'Projects highlighted early.' },
  { key: 'sidebar_photo', name: 'Sidebar + Photo', description: 'Dark sidebar with photo.' },
  { key: 'accent_pink', name: 'Pink Accent', description: 'Pink accent with right contact card.' },
  { key: 'teal_circle', name: 'Teal Circle', description: 'Circular photo header + teal dividers.' },
  { key: 'navy_gold', name: 'Navy Gold', description: 'Navy sidebar with gold accents.' },
  { key: 'sunset', name: 'Sunset', description: 'Warm gradient header with orange tones.' },
];

export const CV_TEMPLATE_KEYS: CvTemplateKey[] = CV_TEMPLATES.map(t => t.key);

/**
 * Type guard to check if a string is a valid CvTemplateKey
 */
export function isCvTemplateKey(key: unknown): key is CvTemplateKey {
  return typeof key === 'string' && CV_TEMPLATE_KEYS.includes(key as CvTemplateKey);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderExperienceSection(experience: ResumeContent['experience']): string {
  if (!experience || experience.length === 0) return '';

  return experience.map(exp => `
### ${escapeHtml(exp.title)} at ${escapeHtml(exp.company)}
*${escapeHtml(exp.startDate)} - ${escapeHtml(exp.endDate)}*

${exp.highlights?.map(h => `- ${escapeHtml(h)}`).join('\n') || ''}
`).join('\n');
}

function renderEducationSection(education: ResumeContent['education']): string {
  if (!education || education.length === 0) return '';

  return education.map(edu => `
### ${escapeHtml(edu.degree)}
**${escapeHtml(edu.school)}** | ${escapeHtml(edu.startDate)} - ${escapeHtml(edu.endDate)}
`).join('\n');
}

function renderProjectsSection(projects: ResumeContent['projects']): string {
  if (!projects || projects.length === 0) return '';

  return projects.map(proj => `
### ${escapeHtml(proj.name)}
${escapeHtml(proj.description)}
${proj.links?.length > 0 ? proj.links.map(l => `- [${escapeHtml(l)}](${escapeHtml(l)})`).join('\n') : ''}
`).join('\n');
}

// ============================================================================
// TEMPLATE RENDERERS (11 templates)
// ============================================================================

function renderStandardTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-standard">
<style>
.cv-standard { font-family: 'Source Sans 3', 'Segoe UI', sans-serif; max-width: 860px; margin: 24px auto; padding: 48px 52px; color: #0f172a; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); position: relative; overflow: hidden; }
.cv-standard::before { content: ''; position: absolute; inset: -30% 0 auto 0; height: 220px; background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.18), transparent 60%), radial-gradient(circle at 80% 10%, rgba(14, 165, 233, 0.16), transparent 55%); pointer-events: none; }
.cv-standard h1 { font-family: 'Playfair Display', 'Times New Roman', serif; color: #0f172a; margin-bottom: 6px; font-size: 34px; letter-spacing: 0.3px; }
.cv-standard .contact-info { color: #475569; margin-bottom: 24px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
.cv-standard h2 { color: #1d4ed8; border-bottom: 2px solid rgba(29, 78, 216, 0.2); padding-bottom: 6px; margin-top: 26px; text-transform: uppercase; font-size: 13px; letter-spacing: 1.4px; }
.cv-standard h3 { color: #0f172a; margin-bottom: 6px; font-size: 16px; }
.cv-standard .skills-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.cv-standard .skill-tag { background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(14, 165, 233, 0.14)); color: #1e3a8a; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; }
</style>

# ${escapeHtml(contact.fullName || 'Name Not Provided')}

<div class="contact-info">
${contact.email ? `📧 ${escapeHtml(contact.email)}` : ''} ${contact.phone ? `| 📱 ${escapeHtml(contact.phone)}` : ''} ${contact.location ? `| 📍 ${escapeHtml(contact.location)}` : ''}
${contact.linkedin ? `| [LinkedIn](${escapeHtml(contact.linkedin)})` : ''} ${contact.portfolio ? `| [Portfolio](${escapeHtml(contact.portfolio)})` : ''}
</div>

${content.summary ? `## Summary\n${escapeHtml(content.summary)}` : ''}

## Skills
<div class="skills-list">
${content.skills?.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join(' ') || 'No skills listed'}
</div>

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}

${content.projects?.length > 0 ? `## Projects\n${renderProjectsSection(content.projects)}` : ''}

${content.certifications?.length > 0 ? `## Certifications\n${content.certifications.map(c => `- ${escapeHtml(c)}`).join('\n')}` : ''}

${content.languages?.length > 0 ? `## Languages\n${content.languages.map(l => `- ${escapeHtml(l)}`).join('\n')}` : ''}
</div>
`;
}

function renderExperienceFirstTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-experience-first">
<style>
.cv-experience-first { font-family: 'Space Grotesk', 'Segoe UI', sans-serif; max-width: 860px; margin: 24px auto; background: #ffffff; border-radius: 26px; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16); border: 1px solid #e2e8f0; }
.cv-experience-first .header { background: linear-gradient(125deg, #4338ca 0%, #6366f1 45%, #0ea5e9 100%); color: white; padding: 48px 56px 42px; position: relative; }
.cv-experience-first .header::after { content: ''; position: absolute; right: -60px; top: -80px; width: 240px; height: 240px; border-radius: 50%; background: rgba(255, 255, 255, 0.12); }
.cv-experience-first .header h1 { margin: 0; font-size: 34px; letter-spacing: 0.4px; }
.cv-experience-first .header .contact { opacity: 0.92; margin-top: 12px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 10px; }
.cv-experience-first .content { padding: 28px 48px 40px; }
.cv-experience-first h2 { color: #4338ca; margin-top: 30px; font-size: 14px; text-transform: uppercase; letter-spacing: 1.2px; }
.cv-experience-first .experience-item { border-left: 3px solid rgba(67, 56, 202, 0.45); padding-left: 18px; margin-bottom: 22px; position: relative; }
.cv-experience-first .experience-item::before { content: ''; position: absolute; left: -7px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: #4338ca; box-shadow: 0 0 0 6px rgba(67, 56, 202, 0.15); }
</style>

<div class="header">
<h1>${escapeHtml(contact.fullName || 'Name Not Provided')}</h1>
<div class="contact">
${contact.email || ''} ${contact.phone ? `• ${contact.phone}` : ''} ${contact.location ? `• ${contact.location}` : ''}
</div>
</div>

<div class="content">

## Experience
${content.experience?.map(exp => `
<div class="experience-item">

### ${escapeHtml(exp.title)}
**${escapeHtml(exp.company)}** | ${escapeHtml(exp.startDate)} - ${escapeHtml(exp.endDate)}

${exp.highlights?.map(h => `- ${escapeHtml(h)}`).join('\n') || ''}
</div>
`).join('\n') || 'No experience listed'}

## Skills
${content.skills?.join(' • ') || 'No skills listed'}

## Education
${renderEducationSection(content.education)}

${content.summary ? `## About\n${escapeHtml(content.summary)}` : ''}
</div>
</div>
`;
}

function renderSkillsFirstTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-skills-first">
<style>
.cv-skills-first { font-family: 'Sora', 'Segoe UI', sans-serif; max-width: 920px; margin: 24px auto; display: grid; grid-template-columns: 300px 1fr; border-radius: 26px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14); background: #ffffff; }
.cv-skills-first .sidebar { background: linear-gradient(180deg, #0f172a 0%, #111827 40%, #1f2937 100%); color: white; padding: 36px 30px; }
.cv-skills-first .sidebar h1 { font-size: 26px; margin-bottom: 18px; letter-spacing: 0.3px; }
.cv-skills-first .sidebar h2 { font-size: 12px; color: #cbd5f5; margin-top: 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.4); padding-bottom: 6px; text-transform: uppercase; letter-spacing: 1.3px; }
.cv-skills-first .skill-meter { background: rgba(148, 163, 184, 0.3); border-radius: 999px; height: 8px; margin: 8px 0 14px; }
.cv-skills-first .skill-meter-fill { background: linear-gradient(90deg, #60a5fa, #22d3ee); height: 100%; border-radius: 999px; width: 78%; }
.cv-skills-first .main { padding: 36px 40px 42px; }
.cv-skills-first .main h2 { color: #0f172a; text-transform: uppercase; font-size: 13px; letter-spacing: 1.2px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
</style>

<div class="sidebar">
<h1>${escapeHtml(contact.fullName || 'Name')}</h1>

<h2>CONTACT</h2>
${contact.email ? `<p>📧 ${escapeHtml(contact.email)}</p>` : ''}
${contact.phone ? `<p>📱 ${escapeHtml(contact.phone)}</p>` : ''}
${contact.location ? `<p>📍 ${escapeHtml(contact.location)}</p>` : ''}

<h2>SKILLS</h2>
${content.skills?.map(s => `
<p>${escapeHtml(s)}</p>
<div class="skill-meter"><div class="skill-meter-fill"></div></div>
`).join('') || 'No skills listed'}

<h2>LANGUAGES</h2>
${content.languages?.map(l => `<p>• ${escapeHtml(l)}</p>`).join('') || ''}
</div>

<div class="main">
${content.summary ? `## Summary\n${escapeHtml(content.summary)}` : ''}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
</div>
`;
}

function renderCompactTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-compact">
<style>
.cv-compact { font-family: 'Nunito Sans', 'Segoe UI', sans-serif; max-width: 820px; margin: 24px auto; padding: 28px 32px; font-size: 12.5px; line-height: 1.5; color: #0f172a; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12); }
.cv-compact h1 { font-size: 22px; margin-bottom: 6px; letter-spacing: 0.2px; }
.cv-compact h2 { font-size: 12px; color: #1e3a8a; background: linear-gradient(90deg, rgba(59, 130, 246, 0.12), transparent); padding: 6px 12px; margin: 18px 0 10px 0; text-transform: uppercase; letter-spacing: 1.4px; }
.cv-compact h3 { font-size: 12px; margin-bottom: 3px; color: #111827; }
.cv-compact .contact-line { color: #475569; margin-bottom: 16px; }
.cv-compact .skills-compact { color: #475569; }
</style>

# ${escapeHtml(contact.fullName || 'Name')}
<div class="contact-line">${contact.email || ''} | ${contact.phone || ''} | ${contact.location || ''}</div>

## SKILLS
<div class="skills-compact">${content.skills?.join(', ') || 'None listed'}</div>

## EXPERIENCE
${content.experience?.map(exp => `**${escapeHtml(exp.title)}** - ${escapeHtml(exp.company)} (${escapeHtml(exp.startDate)} - ${escapeHtml(exp.endDate)})
${exp.highlights?.slice(0, 2).map(h => `• ${escapeHtml(h)}`).join(' ') || ''}`).join('\n\n') || 'None listed'}

## EDUCATION
${content.education?.map(edu => `**${escapeHtml(edu.degree)}** - ${escapeHtml(edu.school)} (${escapeHtml(edu.endDate)})`).join('\n') || 'None listed'}
</div>
`;
}

function renderEducationFirstTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-education-first">
<style>
.cv-education-first { font-family: 'Cormorant Garamond', 'Times New Roman', serif; max-width: 760px; margin: 24px auto; padding: 48px 52px; color: #1f2937; background: #fffdf8; border: 1px solid #efe7dd; border-radius: 22px; box-shadow: 0 20px 48px rgba(60, 47, 30, 0.12); }
.cv-education-first h1 { text-align: center; font-size: 30px; margin-bottom: 8px; letter-spacing: 0.6px; }
.cv-education-first .contact-center { text-align: center; color: #6b7280; margin-bottom: 28px; font-size: 14px; }
.cv-education-first h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2.4px; border-bottom: 1px solid rgba(51, 65, 85, 0.3); padding-bottom: 6px; margin-top: 28px; }
</style>

# ${escapeHtml(contact.fullName || 'Name')}
<div class="contact-center">${contact.email || ''} • ${contact.phone || ''} • ${contact.location || ''}</div>

## Education
${renderEducationSection(content.education)}

## Experience
${renderExperienceSection(content.experience)}

## Skills
${content.skills?.join(' • ') || 'None listed'}
</div>
`;
}

function renderProjectFocusTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-project-focus">
<style>
.cv-project-focus { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; max-width: 860px; margin: 24px auto; padding: 40px 44px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 22px; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12); }
.cv-project-focus h1 { color: #047857; font-size: 30px; letter-spacing: 0.3px; }
.cv-project-focus h2 { color: #065f46; border-left: 4px solid #34d399; padding-left: 12px; text-transform: uppercase; letter-spacing: 1.2px; font-size: 13px; }
.cv-project-focus .project-card { background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(52, 211, 153, 0.12)); border: 1px solid rgba(16, 185, 129, 0.2); padding: 18px; margin: 14px 0; border-radius: 14px; }
.cv-project-focus .project-card h3 { margin: 0 0 10px 0; color: #064e3b; font-size: 16px; }
</style>

# ${escapeHtml(contact.fullName || 'Name')}
${contact.email || ''} | ${contact.location || ''}

## Featured Projects
${content.projects?.map(proj => `
<div class="project-card">

### ${escapeHtml(proj.name)}
${escapeHtml(proj.description)}
</div>
`).join('\n') || 'No projects listed'}

## Technical Skills
${content.skills?.join(' | ') || 'None listed'}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
`;
}

function renderSidebarPhotoTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-sidebar-photo">
<style>
.cv-sidebar-photo { font-family: 'Manrope', 'Segoe UI', sans-serif; max-width: 920px; margin: 24px auto; display: grid; grid-template-columns: 260px 1fr; border-radius: 26px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 22px 55px rgba(15, 23, 42, 0.14); background: #ffffff; }
.cv-sidebar-photo .sidebar { background: linear-gradient(180deg, #0f172a 0%, #111827 100%); color: white; padding: 34px 28px; }
.cv-sidebar-photo .photo-placeholder { width: 150px; height: 150px; border-radius: 28px; background: linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(59, 130, 246, 0.2)); margin: 0 auto 22px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.cv-sidebar-photo .sidebar h2 { font-size: 11px; color: #cbd5f5; text-transform: uppercase; letter-spacing: 1.6px; margin-top: 24px; }
.cv-sidebar-photo .main { padding: 36px 40px 44px; }
.cv-sidebar-photo .main h1 { color: #0f172a; font-size: 30px; letter-spacing: 0.4px; }
.cv-sidebar-photo .main h2 { color: #0f172a; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 13px; letter-spacing: 1.2px; padding-bottom: 6px; }
</style>

<div class="sidebar">
<div class="photo-placeholder">📷</div>

<h2>Contact</h2>
${contact.email ? `<p>📧 ${escapeHtml(contact.email)}</p>` : ''}
${contact.phone ? `<p>📱 ${escapeHtml(contact.phone)}</p>` : ''}
${contact.location ? `<p>📍 ${escapeHtml(contact.location)}</p>` : ''}
${contact.linkedin ? `<p>🔗 LinkedIn</p>` : ''}

<h2>Skills</h2>
${content.skills?.map(s => `<p>• ${escapeHtml(s)}</p>`).join('') || ''}

<h2>Languages</h2>
${content.languages?.map(l => `<p>• ${escapeHtml(l)}</p>`).join('') || ''}
</div>

<div class="main">
# ${escapeHtml(contact.fullName || 'Name')}

${content.summary ? `## Profile\n${escapeHtml(content.summary)}` : ''}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
</div>
`;
}

function renderAccentPinkTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-accent-pink">
<style>
.cv-accent-pink { font-family: 'DM Sans', 'Segoe UI', sans-serif; max-width: 840px; margin: 24px auto; padding: 44px 48px; background: #ffffff; border-radius: 24px; border: 1px solid #f1d4e3; box-shadow: 0 18px 46px rgba(190, 24, 93, 0.12); }
.cv-accent-pink h1 { color: #be185d; font-size: 32px; letter-spacing: 0.3px; }
.cv-accent-pink h2 { color: #be185d; text-transform: uppercase; letter-spacing: 1.2px; font-size: 13px; border-bottom: 1px solid rgba(190, 24, 93, 0.2); padding-bottom: 6px; }
.cv-accent-pink .contact-card { float: right; background: linear-gradient(135deg, rgba(244, 114, 182, 0.18), rgba(253, 224, 71, 0.12)); border-left: 4px solid #be185d; padding: 18px 20px; margin-left: 20px; width: 220px; border-radius: 16px; box-shadow: 0 8px 18px rgba(190, 24, 93, 0.15); }
.cv-accent-pink .skill-tag { display: inline-block; background: rgba(190, 24, 93, 0.1); color: #9d174d; padding: 6px 14px; border-radius: 999px; margin: 4px 6px 0 0; font-size: 13px; font-weight: 600; }
</style>

<div class="contact-card">
<strong>Contact</strong><br>
${contact.email ? `📧 ${escapeHtml(contact.email)}<br>` : ''}
${contact.phone ? `📱 ${escapeHtml(contact.phone)}<br>` : ''}
${contact.location ? `📍 ${escapeHtml(contact.location)}` : ''}
</div>

# ${escapeHtml(contact.fullName || 'Name')}

${content.summary ? escapeHtml(content.summary) : ''}

## Skills
${content.skills?.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join(' ') || ''}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
`;
}

function renderTealCircleTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-teal-circle">
<style>
.cv-teal-circle { font-family: 'Outfit', 'Segoe UI', sans-serif; max-width: 840px; margin: 24px auto; padding: 44px 50px; background: #ffffff; border: 1px solid #d1f0ec; border-radius: 24px; box-shadow: 0 18px 44px rgba(13, 148, 136, 0.14); }
.cv-teal-circle .header { text-align: center; margin-bottom: 30px; }
.cv-teal-circle .photo-circle { width: 128px; height: 128px; border-radius: 32px; background: linear-gradient(135deg, #0d9488, #14b8a6); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 34px; letter-spacing: 1px; }
.cv-teal-circle h1 { color: #0f172a; margin: 0; font-size: 32px; }
.cv-teal-circle h2 { color: #0f766e; border-bottom: 2px solid rgba(15, 118, 110, 0.3); padding-bottom: 6px; text-transform: uppercase; font-size: 13px; letter-spacing: 1.2px; }
.cv-teal-circle .divider { height: 3px; background: linear-gradient(90deg, rgba(13, 148, 136, 0.6), transparent); margin: 20px 0; }
</style>

<div class="header">
<div class="photo-circle">${escapeHtml((contact.fullName || 'N')[0])}</div>
<h1>${escapeHtml(contact.fullName || 'Name')}</h1>
<p>${contact.email || ''} | ${contact.phone || ''} | ${contact.location || ''}</p>
</div>

<div class="divider"></div>

${content.summary ? `## About Me\n${escapeHtml(content.summary)}` : ''}

## Skills
${content.skills?.join(' • ') || 'None listed'}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
`;
}

function renderNavyGoldTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-navy-gold">
<style>
.cv-navy-gold { font-family: 'Cormorant Upright', 'Times New Roman', serif; max-width: 920px; margin: 24px auto; display: grid; grid-template-columns: 280px 1fr; border-radius: 26px; overflow: hidden; border: 1px solid #e4d7c1; box-shadow: 0 22px 52px rgba(30, 58, 95, 0.2); }
.cv-navy-gold .sidebar { background: linear-gradient(180deg, #0b1f3a 0%, #1e3a5f 100%); color: white; padding: 34px 28px; }
.cv-navy-gold .sidebar h1 { color: #fbbf24; font-size: 26px; letter-spacing: 0.5px; }
.cv-navy-gold .sidebar h2 { color: #fbbf24; font-size: 12px; text-transform: uppercase; margin-top: 24px; border-bottom: 1px solid rgba(251, 191, 36, 0.4); padding-bottom: 6px; letter-spacing: 1.6px; }
.cv-navy-gold .main { padding: 36px 40px 44px; background: #fffbeb; }
.cv-navy-gold .main h2 { color: #1e3a5f; border-bottom: 2px solid rgba(30, 58, 95, 0.3); text-transform: uppercase; font-size: 13px; letter-spacing: 1.2px; }
.cv-navy-gold .gold-accent { color: #b45309; }
</style>

<div class="sidebar">
<h1>${escapeHtml(contact.fullName || 'Name')}</h1>

<h2>Contact</h2>
${contact.email ? `<p>${escapeHtml(contact.email)}</p>` : ''}
${contact.phone ? `<p>${escapeHtml(contact.phone)}</p>` : ''}
${contact.location ? `<p>${escapeHtml(contact.location)}</p>` : ''}

<h2>Expertise</h2>
${content.skills?.map(s => `<p>★ ${escapeHtml(s)}</p>`).join('') || ''}

<h2>Languages</h2>
${content.languages?.map(l => `<p>• ${escapeHtml(l)}</p>`).join('') || ''}
</div>

<div class="main">
${content.summary ? `## Professional Summary\n${escapeHtml(content.summary)}` : ''}

## Career History
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}
</div>
</div>
`;
}

function renderSunsetTemplate(contact: ResumeContact, content: ResumeContent): string {
  return `
<div class="cv-container cv-sunset">
<style>
.cv-sunset { font-family: 'Montserrat', 'Segoe UI', sans-serif; max-width: 860px; margin: 24px auto; border-radius: 26px; overflow: hidden; border: 1px solid #f4d1c4; box-shadow: 0 22px 52px rgba(124, 58, 237, 0.18); background: #ffffff; }
.cv-sunset .header { background: linear-gradient(135deg, #fb923c 0%, #f97316 40%, #ec4899 70%, #7c3aed 100%); color: white; padding: 52px 44px; text-align: center; position: relative; }
.cv-sunset .header::after { content: ''; position: absolute; inset: auto 12% -40px 12%; height: 80px; background: rgba(255, 255, 255, 0.14); filter: blur(10px); border-radius: 999px; }
.cv-sunset .header h1 { font-size: 36px; margin: 0; text-shadow: 0 12px 28px rgba(0,0,0,0.25); letter-spacing: 0.5px; }
.cv-sunset .header p { opacity: 0.95; margin-top: 10px; }
.cv-sunset .content { padding: 32px 46px 42px; }
.cv-sunset h2 { color: #c2410c; text-transform: uppercase; font-size: 13px; letter-spacing: 1.3px; border-bottom: 1px solid rgba(194, 65, 12, 0.25); padding-bottom: 6px; }
.cv-sunset .skill-tag { display: inline-block; background: linear-gradient(135deg, rgba(251, 146, 60, 0.18), rgba(236, 72, 153, 0.18)); color: #9a3412; padding: 6px 14px; border-radius: 999px; margin: 4px 6px 0 0; font-weight: 600; font-size: 13px; }
</style>

<div class="header">
<h1>${escapeHtml(contact.fullName || 'Name')}</h1>
<p>${contact.email || ''} • ${contact.phone || ''} • ${contact.location || ''}</p>
</div>

<div class="content">

${content.summary ? `## About\n${escapeHtml(content.summary)}` : ''}

## Skills
${content.skills?.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join(' ') || ''}

## Experience
${renderExperienceSection(content.experience)}

## Education
${renderEducationSection(content.education)}

${content.projects?.length > 0 ? `## Projects\n${renderProjectsSection(content.projects)}` : ''}
</div>
</div>
`;
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render CV markdown from template
 * 
 * @param templateKey - The template key to use
 * @param contact - Contact information from extracted data
 * @param content - Full extracted data for content sections
 * @returns Rendered HTML/Markdown hybrid string
 */
export function renderCvMarkdownFromTemplate(
  templateKey: CvTemplateKey,
  contact: ResumeContact,
  content: ResumeContent
): string {
  switch (templateKey) {
    case 'standard': return renderStandardTemplate(contact, content);
    case 'experience_first': return renderExperienceFirstTemplate(contact, content);
    case 'skills_first': return renderSkillsFirstTemplate(contact, content);
    case 'compact': return renderCompactTemplate(contact, content);
    case 'education_first': return renderEducationFirstTemplate(contact, content);
    case 'project_focus': return renderProjectFocusTemplate(contact, content);
    case 'sidebar_photo': return renderSidebarPhotoTemplate(contact, content);
    case 'accent_pink': return renderAccentPinkTemplate(contact, content);
    case 'teal_circle': return renderTealCircleTemplate(contact, content);
    case 'navy_gold': return renderNavyGoldTemplate(contact, content);
    case 'sunset': return renderSunsetTemplate(contact, content);
    default: return renderStandardTemplate(contact, content);
  }
}
