import seedrandom from 'seedrandom';

export class SeededRNG {
  private rng: seedrandom.PRNG;
  
  constructor(seed: number | string) {
    this.rng = seedrandom(seed.toString());
  }
  
  // Generate a random integer in [min, max]
  nextInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }
  
  // Generate a random float in [0, 1)
  nextFloat(): number {
    return this.rng();
  }
  
  // Generate a random float in [min, max)
  nextFloatRange(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }
  
  // Choose a random element from an array
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
  
  // Shuffle an array in place
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  // Generate a random boolean with given probability
  nextBoolean(probability: number = 0.5): boolean {
    return this.rng() < probability;
  }
  
  // Generate a random string
  nextString(length: number, charset: string = 'abcdefghijklmnopqrstuvwxyz'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.choice(charset);
    }
    return result;
  }
  
  // Reset the RNG with a new seed
  reset(seed: number | string): void {
    this.rng = seedrandom(seed.toString());
  }
  
  // Get the current seed (if available)
  getSeed(): string {
    return this.rng.seed || 'unknown';
  }
}
