/* Fit the character area into available space without stretching or cropping it. */
(() => {
  'use strict';
  function fit({ imageWidth, imageHeight, subject, area }) {
    const [left, top, right, bottom] = subject;
    const subjectWidth = imageWidth * (right - left);
    const subjectHeight = imageHeight * (bottom - top);
    const scale = Math.min(area.width / subjectWidth, area.height / subjectHeight);
    const width = imageWidth * scale, height = imageHeight * scale;
    return {
      width, height,
      left: area.left + (area.width - subjectWidth * scale) / 2 - left * width,
      top: area.top + (area.height - subjectHeight * scale) / 2 - top * height
    };
  }
  globalThis.RR_SCENE_FRAMING = Object.freeze({ fit });
})();
