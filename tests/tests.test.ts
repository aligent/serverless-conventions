describe('Passing tests', () => {
    test('Passing test', () => {
        expect(1).toBeTruthy();
    });

    test('Failing test', () => {
        expect(1).toBeGreaterThan(0);
    });
});