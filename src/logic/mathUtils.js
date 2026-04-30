/**
 * AgriSense Pro v17.1.0 Math Utilities
 * Geometric calculations for field mapping and sensor diagnostics.
 */

/**
 * Calculates the area of a polygon defined by coordinate points using the Shoelace formula.
 * @param {Array} points - Array of {x, y} objects.
 * @returns {number} - Calculated area.
 */
export const calculateFieldArea = (points) => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

/**
 * Calculates the Euclidean distance between two points.
 * @param {Object} p1 - {x, y}
 * @param {Object} p2 - {x, y}
 * @returns {number} - Distance.
 */
export const getEuclideanDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};
