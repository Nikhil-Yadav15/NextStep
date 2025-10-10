import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
export async function generateResumePDF(content) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const { personalInfo, professionalSummary, structuredSkills, projects, atsKeywords, goals } = content;
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(personalInfo.name.toUpperCase(), { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .moveDown(0.3)
         .text(`${personalInfo.email} | ${personalInfo.phone}`, { align: 'center' });

      doc.moveDown(1);
      addHorizontalLine(doc);
      doc.moveDown(0.5);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('PROFESSIONAL SUMMARY', { underline: false });

      doc.fontSize(10)
         .font('Helvetica')
         .moveDown(0.3)
         .text(professionalSummary, { align: 'justify', lineGap: 2 });

      if (goals && goals.length > 0) {
        doc.moveDown(1);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('CAREER OBJECTIVE', { underline: false });

        doc.fontSize(10)
           .font('Helvetica')
           .moveDown(0.3);

        goals.forEach(goal => {
          doc.text(`• ${goal}`, { lineGap: 2 });
        });
      }

      doc.moveDown(1);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('SKILLS', { underline: false });

      doc.fontSize(10)
         .font('Helvetica')
         .moveDown(0.3);

      if (structuredSkills.technical && structuredSkills.technical.length > 0) {
        doc.font('Helvetica-Bold').text('Technical Skills: ', { continued: true });
        doc.font('Helvetica').text(structuredSkills.technical.join(', '));
      }

      if (structuredSkills.frameworks && structuredSkills.frameworks.length > 0) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').text('Frameworks & Tools: ', { continued: true });
        doc.font('Helvetica').text(structuredSkills.frameworks.join(', '));
      }

      if (structuredSkills.soft && structuredSkills.soft.length > 0) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').text('Soft Skills: ', { continued: true });
        doc.font('Helvetica').text(structuredSkills.soft.join(', '));
      }

      if (structuredSkills.domain && structuredSkills.domain.length > 0) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').text('Domain Knowledge: ', { continued: true });
        doc.font('Helvetica').text(structuredSkills.domain.join(', '));
      }

      if (projects && projects.length > 0) {
        doc.moveDown(1);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('SUGGESTED PROJECTS', { underline: false });

        doc.fontSize(10)
           .font('Helvetica')
           .moveDown(0.3);

        projects.forEach((project, index) => {
          doc.font('Helvetica-Bold')
             .text(`${project.title}`, { continued: false });

          doc.font('Helvetica')
             .moveDown(0.2)
             .text(project.description, { lineGap: 2 });

          if (project.techStack && project.techStack.length > 0) {
            doc.moveDown(0.1)
               .text(`Tech Stack: ${project.techStack.join(', ')}`, { lineGap: 2 });
          }

          if (project.impact) {
            doc.moveDown(0.1)
               .text(`Impact: ${project.impact}`, { lineGap: 2 });
          }

          if (index < projects.length - 1) {
            doc.moveDown(0.5);
          }
        });
      }

      doc.moveDown(1);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('EDUCATION', { underline: false });

      doc.fontSize(10)
         .font('Helvetica')
         .moveDown(0.3)
         .text('• Add your educational qualifications here', { lineGap: 2 });
      
      doc.text('• Include degree, institution, graduation year, and GPA/honors if applicable', { lineGap: 2 });

      doc.moveDown(1);
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('WORK EXPERIENCE', { underline: false });

      doc.fontSize(10)
         .font('Helvetica')
         .moveDown(0.3)
         .text('• Add your professional work experience here', { lineGap: 2 });
      
      doc.text('• Use action verbs and quantify achievements (e.g., "Increased efficiency by 30%")', { lineGap: 2 });

      if (atsKeywords && atsKeywords.length > 0) {
        doc.moveDown(1.5);
        doc.fontSize(7)
           .fillColor('#FFFFFF') 
           .text(`Keywords: ${atsKeywords.join(', ')}`, { lineGap: 1 });
      }
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

function addHorizontalLine(doc) {
  const pageWidth = doc.page.width;
  const margins = doc.page.margins;
  
  doc.moveTo(margins.left, doc.y)
     .lineTo(pageWidth - margins.right, doc.y)
     .stroke();
}
