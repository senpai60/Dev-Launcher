import { GeneratorProgress } from '../../../types/generator';
import { expect } from 'vitest';

/**
 * Log stream collector utility for capturing and validating progress IPC events.
 */
export class LogStreamCollector {
  public events: GeneratorProgress[] = [];

  /**
   * Pushes a new progress event into the collector array.
   */
  public push(event: GeneratorProgress): void {
    this.events.push(event);
  }

  /**
   * Asserts that the steps recorded include the expected steps in relative sequential order.
   */
  public assertStepSequence(expectedSteps: string[]): void {
    const actualSteps = this.events.map(e => e.step);
    expect(actualSteps).toEqual(expect.arrayContaining(expectedSteps));
    
    // Verify relative ordering
    let lastIndex = -1;
    for (const step of expectedSteps) {
      const index = actualSteps.indexOf(step as any, lastIndex + 1);
      expect(index, `Expected step "${step}" to appear after index ${lastIndex}`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  }

  /**
   * Asserts that progress percentages strictly increase or remain equal (monotonic).
   */
  public assertPercentageMonotonic(): void {
    for (let i = 1; i < this.events.length; i++) {
      expect(
        this.events[i].percentage,
        `Progress percentage decreased from ${this.events[i - 1].percentage}% to ${this.events[i].percentage}%`
      ).toBeGreaterThanOrEqual(this.events[i - 1].percentage);
    }
  }

  /**
   * Returns all non-empty log lines captured from stderr/stdout streams.
   */
  public getLogs(): string[] {
    return this.events.filter(e => e.logLine !== undefined).map(e => e.logLine!);
  }

  /**
   * Checks if a specific step was emitted.
   */
  public hasStep(step: string): boolean {
    return this.events.some(e => e.step === step);
  }

  /**
   * Resets collected event history.
   */
  public clear(): void {
    this.events = [];
  }
}
