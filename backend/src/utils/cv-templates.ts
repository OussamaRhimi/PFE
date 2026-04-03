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
.cv-standard { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
.cv-standard h1 { color: #2563eb; margin-bottom: 5px; font-size: 28px; }
.cv-standard .contact-info { color: #666; margin-bottom: 20px; }
.cv-standard h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 5px; margin-top: 25px; }
.cv-standard h3 { color: #1f2937; margin-bottom: 5px; }
.cv-standard .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
.cv-standard .skill-tag { background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 15px; font-size: 14px; }
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
.cv-experience-first { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; }
.cv-experience-first .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; margin: -20px -20px 20px -20px; }
.cv-experience-first .header h1 { margin: 0; font-size: 32px; }
.cv-experience-first .header .contact { opacity: 0.9; margin-top: 10px; }
.cv-experience-first .content { padding: 20px; }
.cv-experience-first h2 { color: #667eea; margin-top: 30px; }
.cv-experience-first .experience-item { border-left: 3px solid #667eea; padding-left: 15px; margin-bottom: 20px; }
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
.cv-skills-first { font-family: 'Roboto', Arial, sans-serif; max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 280px 1fr; }
.cv-skills-first .sidebar { background: #1f2937; color: white; padding: 30px; }
.cv-skills-first .sidebar h1 { font-size: 24px; margin-bottom: 20px; }
.cv-skills-first .sidebar h2 { font-size: 16px; color: #9ca3af; margin-top: 25px; border-bottom: 1px solid #374151; padding-bottom: 5px; }
.cv-skills-first .skill-meter { background: #374151; border-radius: 10px; height: 8px; margin: 8px 0; }
.cv-skills-first .skill-meter-fill { background: #60a5fa; height: 100%; border-radius: 10px; width: 80%; }
.cv-skills-first .main { padding: 30px; }
.cv-skills-first .main h2 { color: #1f2937; }
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
.cv-compact { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 12px; line-height: 1.4; }
.cv-compact h1 { font-size: 20px; margin-bottom: 5px; }
.cv-compact h2 { font-size: 14px; color: #333; background: #f3f4f6; padding: 5px 10px; margin: 15px 0 10px 0; }
.cv-compact h3 { font-size: 12px; margin-bottom: 2px; }
.cv-compact .contact-line { color: #666; margin-bottom: 15px; }
.cv-compact .skills-compact { color: #666; }
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
.cv-education-first { font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #333; }
.cv-education-first h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
.cv-education-first .contact-center { text-align: center; color: #666; margin-bottom: 30px; }
.cv-education-first h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px; }
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
.cv-project-focus { font-family: 'Consolas', monospace; max-width: 800px; margin: 0 auto; padding: 30px; }
.cv-project-focus h1 { color: #059669; }
.cv-project-focus h2 { color: #059669; border-left: 4px solid #059669; padding-left: 10px; }
.cv-project-focus .project-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 10px 0; border-radius: 8px; }
.cv-project-focus .project-card h3 { margin: 0 0 10px 0; color: #166534; }
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
.cv-sidebar-photo { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 250px 1fr; }
.cv-sidebar-photo .sidebar { background: #111827; color: white; padding: 30px; }
.cv-sidebar-photo .photo-placeholder { width: 150px; height: 150px; border-radius: 50%; background: #374151; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
.cv-sidebar-photo .sidebar h2 { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-top: 25px; }
.cv-sidebar-photo .main { padding: 30px; }
.cv-sidebar-photo .main h1 { color: #111827; }
.cv-sidebar-photo .main h2 { color: #111827; border-bottom: 2px solid #111827; }
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
.cv-accent-pink { font-family: 'Helvetica', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
.cv-accent-pink h1 { color: #db2777; font-size: 32px; }
.cv-accent-pink h2 { color: #db2777; }
.cv-accent-pink .contact-card { float: right; background: #fdf2f8; border-left: 4px solid #db2777; padding: 20px; margin-left: 20px; width: 200px; }
.cv-accent-pink .skill-tag { display: inline-block; background: #fce7f3; color: #9d174d; padding: 4px 12px; border-radius: 15px; margin: 3px; }
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
.cv-teal-circle { font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
.cv-teal-circle .header { text-align: center; margin-bottom: 30px; }
.cv-teal-circle .photo-circle { width: 120px; height: 120px; border-radius: 50%; background: #0d9488; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 36px; }
.cv-teal-circle h1 { color: #0d9488; margin: 0; }
.cv-teal-circle h2 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 5px; }
.cv-teal-circle .divider { height: 3px; background: linear-gradient(90deg, #0d9488, transparent); margin: 20px 0; }
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
.cv-navy-gold { font-family: 'Georgia', serif; max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 280px 1fr; }
.cv-navy-gold .sidebar { background: #1e3a5f; color: white; padding: 30px; }
.cv-navy-gold .sidebar h1 { color: #fbbf24; font-size: 24px; }
.cv-navy-gold .sidebar h2 { color: #fbbf24; font-size: 14px; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #fbbf24; padding-bottom: 5px; }
.cv-navy-gold .main { padding: 30px; background: #fefce8; }
.cv-navy-gold .main h2 { color: #1e3a5f; border-bottom: 2px solid #1e3a5f; }
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
.cv-sunset { font-family: 'Verdana', sans-serif; max-width: 800px; margin: 0 auto; }
.cv-sunset .header { background: linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%); color: white; padding: 50px 40px; text-align: center; }
.cv-sunset .header h1 { font-size: 36px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
.cv-sunset .header p { opacity: 0.9; }
.cv-sunset .content { padding: 30px 40px; }
.cv-sunset h2 { color: #ea580c; }
.cv-sunset .skill-tag { display: inline-block; background: linear-gradient(135deg, #fed7aa, #fecaca); color: #9a3412; padding: 5px 15px; border-radius: 20px; margin: 3px; }
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
