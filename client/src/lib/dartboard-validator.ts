export function isValidDartScore(score: number): boolean {
  if (score === 0) return true;
  
  const validScores = new Set([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 24, 25, 26, 27, 28, 30, 32, 33,
    34, 36, 38, 39, 40, 42, 45, 48, 50, 51,
    54, 57, 60
  ]);
  
  return validScores.has(score);
}

export function validateVisit(dart1: number, dart2: number, dart3: number) {
  const errors: string[] = [];
  
  if (!isValidDartScore(dart1)) {
    errors.push(`Dart 1 score ${dart1} is not a valid dartboard score`);
  }
  
  if (!isValidDartScore(dart2)) {
    errors.push(`Dart 2 score ${dart2} is not a valid dartboard score`);
  }
  
  if (!isValidDartScore(dart3)) {
    errors.push(`Dart 3 score ${dart3} is not a valid dartboard score`);
  }
  
  const total = dart1 + dart2 + dart3;
  if (total > 180) {
    errors.push(`Total score ${total} exceeds maximum possible (180)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateTotalScore(totalScore: number) {
  const errors: string[] = [];
  
  if (totalScore < 0) {
    errors.push(`Total score cannot be negative`);
  }
  
  if (totalScore > 180) {
    errors.push(`Total score ${totalScore} exceeds maximum possible (180)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}