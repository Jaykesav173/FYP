import jsPDF from 'jspdf';

export const exportSchedulePDF = (schedule, stats, subjects) => {
  if (!schedule) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const primary   = [47, 158, 105];   // teal
  const accent     = [127, 184, 81];  // green
  const textColor  = [45, 45, 45];    // dark gray
  const lightGray  = [200, 200, 200];
  const white      = [255, 255, 255];

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setFont = (bold = false, size = 10, color = textColor) => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
  };

  const addText = (txt, size, bold = false, color = textColor) => {
    setFont(bold, size, color);
    const lines = doc.splitTextToSize(txt, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += size * 0.35 * lines.length + 3;
  };

  const addLine = (color = lightGray) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
  };

  const checkPageBreak = (space) => {
    if (yPos + space > pageHeight - margin) {
      doc.addPage();
      yPos = margin + 5;
    }
  };

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 38, 'F');

  setFont(true, 22, white);
  doc.text('My Study Schedule', margin, 17);

  setFont(false, 9, [210, 240, 225]);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.text(`Generated on ${today}`, margin, 27);

  // Thin accent stripe under header
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 38, pageWidth, 2, 'F');

  yPos = 46;

  // ── Progress Summary ──────────────────────────────────────────────────────
  if (stats) {
    checkPageBreak(50);

    // Section title
    setFont(true, 13, primary);
    doc.text('Progress Summary', margin, yPos);
    yPos += 6;
    addLine(accent);

    const items = [
      { label: 'Overall Completion',  value: `${stats.completion_rate    || 0}%` },
      { label: 'Sessions Completed',  value: `${stats.completed_sessions || 0} / ${stats.total_sessions || 0}` },
      { label: 'Total Subjects',      value: `${stats.total_subjects     || 0}` },
      { label: "Today's Sessions",    value: `${stats.today_completed    || 0} / ${stats.today_sessions || 0}` },
    ];

    // 2-column grid
    const colW = contentWidth / 2;
    for (let i = 0; i < items.length; i += 2) {
      checkPageBreak(10);
      const left  = items[i];
      const right = items[i + 1];

      // Left cell background
      doc.setFillColor(245, 250, 247);
      doc.roundedRect(margin, yPos - 4, colW - 3, 10, 1, 1, 'F');

      setFont(false, 9, [100, 100, 100]);
      doc.text(left.label, margin + 3, yPos + 1);
      setFont(true, 11, primary);
      doc.text(left.value, margin + 3, yPos + 6.5);

      if (right) {
        doc.setFillColor(245, 250, 247);
        doc.roundedRect(margin + colW, yPos - 4, colW - 3, 10, 1, 1, 'F');

        setFont(false, 9, [100, 100, 100]);
        doc.text(right.label, margin + colW + 3, yPos + 1);
        setFont(true, 11, primary);
        doc.text(right.value, margin + colW + 3, yPos + 6.5);
      }

      yPos += 14;
    }

    yPos += 4;
  }

  // ── 7-Day Schedule ────────────────────────────────────────────────────────
  if (schedule && schedule.days) {
    checkPageBreak(25);

    setFont(true, 13, primary);
    doc.text('7-Day Schedule', margin, yPos);
    yPos += 6;
    addLine(accent);

    const todayStr = new Date().toISOString().split('T')[0];

    schedule.days.forEach((day) => {
      checkPageBreak(30);

      const isToday = day.date === todayStr;

      // Day header bar
      doc.setFillColor(isToday ? 232 : 240, isToday ? 248 : 245, isToday ? 240 : 242);
      doc.rect(margin, yPos, contentWidth, 9, 'F');

      if (isToday) {
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.rect(margin, yPos, 3, 9, 'F');
      }

      setFont(true, 10, primary);
      doc.text(`${day.day}  •  ${day.date}`, margin + 6, yPos + 6);

      if (isToday) {
        setFont(true, 8, accent);
        doc.text('TODAY', pageWidth - margin - 16, yPos + 6);
      }

      yPos += 11;

      // Sessions
      if (!day.sessions || day.sessions.length === 0) {
        setFont(false, 9, [160, 160, 160]);
        doc.text('Rest day', margin + 6, yPos);
        yPos += 7;
      } else {
        day.sessions.forEach((session) => {
          checkPageBreak(15);

          const done = session.is_completed;
          const durationMins = session.duration || 0;
          const durationHours = (durationMins / 60).toFixed(1);

          // Status pill
          doc.setFillColor(done ? 220 : 235, done ? 240 : 235, done ? 220 : 235);
          doc.roundedRect(margin + 4, yPos - 3.5, 12, 5, 1, 1, 'F');
          setFont(true, 7, done ? [60, 140, 60] : [140, 140, 140]);
          doc.text(done ? 'DONE' : 'TODO', margin + 5, yPos + 0.5);

          // Time (if available) + Subject + Minutes
          let timeStr = '';
          if (session.time) {
            timeStr = `${session.time} • `;
          }
          
          setFont(true, 9, textColor);
          const sessionTitle = `${timeStr}${session.subject}  •  ${durationMins} min`;
          doc.text(sessionTitle, margin + 19, yPos + 0.5);

          // Hours to study (right-aligned, highlighted)
          doc.setFillColor(accent[0], accent[1], accent[2]);
          doc.roundedRect(pageWidth - margin - 22, yPos - 3.5, 20, 5, 1, 1, 'F');
          setFont(true, 9, white);
          doc.text(`${durationHours}h`, pageWidth - margin - 3, yPos + 0.5, { align: 'right' });

          // Notes (if any)
          if (session.notes) {
            yPos += 5;
            checkPageBreak(6);
            setFont(false, 7.5, [130, 130, 130]);
            const noteLines = doc.splitTextToSize(`Note: ${session.notes}`, contentWidth - 22);
            doc.text(noteLines, margin + 19, yPos);
            yPos += noteLines.length * 4;
          } else {
            yPos += 6;
          }
        });

        // Day summary row
        const completed    = day.sessions.filter((s) => s.is_completed).length;
        const total        = day.sessions.length;
        const totalMinutes = day.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const completedMinutes = day.sessions
          .filter((s) => s.is_completed)
          .reduce((sum, s) => sum + (s.duration || 0), 0);

        const completedHours = (completedMinutes / 60).toFixed(1);
        const totalHours = (totalMinutes / 60).toFixed(1);

        setFont(true, 8, primary);
        doc.text(
          `${completed}/${total} completed  •  ${completedHours}h / ${totalHours}h`,
          margin + 4,
          yPos
        );
        yPos += 4;
      }

      yPos += 5;
    });
  }

  // ── Subject Breakdown ─────────────────────────────────────────────────────
  if (subjects && subjects.length > 0) {
    yPos += 4;
    checkPageBreak(35);

    setFont(true, 13, primary);
    doc.text('Subject Breakdown', margin, yPos);
    yPos += 6;
    addLine(accent);

    const sorted = [...subjects]
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 8);

    sorted.forEach((subject) => {
      checkPageBreak(16);

      const pct      = subject.completion_percentage || 0;
      const daysLeft = subject.days_until_deadline   || 0;
      const barWidth = contentWidth - 55;

      // Subject name
      setFont(true, 9, textColor);
      doc.text(subject.name, margin + 3, yPos);

      // Deadline badge (right-aligned)
      const deadlineLabel =
        daysLeft <= 0  ? 'Overdue'      :
        daysLeft <= 7  ? `${daysLeft}d left` :
                         `${daysLeft}d left`;
      const badgeColor = daysLeft <= 0 ? [200, 60, 60] : daysLeft <= 7 ? [200, 130, 30] : [100, 160, 100];
      setFont(false, 7.5, badgeColor);
      doc.text(deadlineLabel, pageWidth - margin - 3, yPos, { align: 'right' });

      yPos += 4;

      // Progress bar track
      doc.setFillColor(225, 225, 225);
      doc.roundedRect(margin + 3, yPos, barWidth, 3.5, 1, 1, 'F');

      // Progress bar fill
      if (pct > 0) {
        const fillW = Math.max((barWidth * pct) / 100, 2);
        const fillColor = pct >= 80 ? accent : pct >= 40 ? [100, 180, 200] : [200, 130, 80];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.roundedRect(margin + 3, yPos, fillW, 3.5, 1, 1, 'F');
      }

      // Percentage label
      setFont(true, 8, primary);
      doc.text(`${pct}%`, margin + barWidth + 7, yPos + 3);

      yPos += 10;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer bar
    doc.setFillColor(245, 248, 246);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);

    setFont(false, 7.5, [150, 150, 150]);
    doc.text(
      `My Study Schedule  •  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `Schedule_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};