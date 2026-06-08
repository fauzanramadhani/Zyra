import { parseJiraDate, guessCategory } from './import.worker';

describe('Jira CSV Import Utilities', () => {
  describe('parseJiraDate', () => {
    it('should parse standard datetime format correctly', () => {
      const date = parseJiraDate('26/May/26 4:34 PM');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(4); // May is 4 (0-indexed)
      expect(date!.getDate()).toBe(26);
      expect(date!.getHours()).toBe(16);
      expect(date!.getMinutes()).toBe(34);
    });

    it('should parse standard date format with midnight correctly', () => {
      const date = parseJiraDate('30/May/26 12:00 AM');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(4);
      expect(date!.getDate()).toBe(30);
      expect(date!.getHours()).toBe(0);
      expect(date!.getMinutes()).toBe(0);
    });

    it('should handle standard Date parsable formats', () => {
      const date = parseJiraDate('2026-06-08T10:10:43Z');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
    });

    it('should return null for invalid formats', () => {
      expect(parseJiraDate('')).toBeNull();
      expect(parseJiraDate('not-a-date')).toBeNull();
    });
  });

  describe('guessCategory', () => {
    it('should guess DONE correctly', () => {
      expect(guessCategory('Done')).toBe('DONE');
      expect(guessCategory('Resolved')).toBe('DONE');
      expect(guessCategory('Closed')).toBe('DONE');
    });

    it('should guess IN_PROGRESS correctly', () => {
      expect(guessCategory('In Progress')).toBe('IN_PROGRESS');
      expect(guessCategory('In Review')).toBe('IN_PROGRESS');
      expect(guessCategory('Testing')).toBe('IN_PROGRESS');
    });

    it('should default to TODO', () => {
      expect(guessCategory('To Do')).toBe('TODO');
      expect(guessCategory('Backlog')).toBe('TODO');
      expect(guessCategory('Ready for Dev')).toBe('TODO');
    });
  });
});
