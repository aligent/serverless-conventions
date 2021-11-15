import {ServerlessConventions} from "../src/index";
import Serverless from "serverless";

describe('Test conventions plugin', () => {
    const provider : Serverless.Options = {
        stage: 'test',
        region: 'ap-southeast-2'
    };

    // Log any cli events to jest
    const cli = {
        log: jest.fn(),
    }

    // Create an empty serverless instance 
    const serverless : Serverless = new Serverless(provider);
    serverless.cli = cli;

    // Create a serverless conventions instance
    const ServerlessConvention: ServerlessConventions = new ServerlessConventions(
        serverless, provider
    );

    describe('Integration test', () => {
        test('Initialize function valid serverless.yml', async () => {
            // Run the initialize function
            expect(() => { 
                ServerlessConvention.initialize()
            }).not.toThrowError();
        });
    });

    describe('Test handler name checker', () => {
        test('Incorrect handler name', async () => {
            // Not kebab case
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'thisIsABadlyNamedExample',
                handler: "src/This-is-a-badly-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkHandlerName(fn);
            expect(errors.pop()).toMatch('is not kebab case');

            fn = {
                name: 'thisIsABadlyNamedFunction',
                handler: "src/thisIsABadlyNamedExample.handler",
                events: []
            };

            errors = ServerlessConvention.checkHandlerName(fn);
            expect(errors.pop()).toMatch('is not kebab case');

            // No ".handler" extension
            fn = {
                name: 'thisIsABadlyNamedFunction',
                handler: "this-is-a-badly-named-example",
                events: []
            };

            errors = ServerlessConvention.checkHandlerName(fn);
            expect(errors.pop()).toMatch('does not end in ".handler"');

            // No ".handler" extension and not kebab case
            fn = {
                name: 'thisIsABadlyNamedFunction',
                handler: "This-is-a-badly-named-example",
                events: []
            };

            errors = ServerlessConvention.checkHandlerName(fn);
            expect(errors.pop()).toMatch('does not end in ".handler"');
            expect(errors.pop()).toMatch('is not kebab case');
        });

        test('Correct handler name', async () => {
            // Handler name should be in kebab case with .handler extension
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'thisIsAWellNamedExample',
                handler: "src/this-is-a-well-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkHandlerName(fn);
            expect(errors.length).toBe(0);
        });
    });

    describe('Test function name checker', () => {
        test('Incorrect function name', async () => {
            // Kebab case
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'this-is-a-badly-named-example',
                handler: "src/this-is-a-badly-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkFunctionName(fn);
            expect(errors.pop()).toMatch('is not camel case');

            // Capitalising first letter
            fn = {
                name: 'ThisIsABadlyNamedFunction',
                handler: "this-is-a-badly-named-example.handler",
                events: []
            };

            errors = ServerlessConvention.checkFunctionName(fn);
            expect(errors.pop()).toMatch('is not camel case');
        });

        test('Correct function name', async () => {
            // Function name should be in camel case
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'thisIsAWellNamedExample',
                handler: "src/this-is-a-well-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkFunctionName(fn);
            expect(errors.length).toBe(0);
        });
    });

    describe('Test handler name matches function check', () => {
        test('Incorrect handler and function name', async () => {
            // With path and .handler
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'thisIsABadlyNamedFunction',
                handler: "src/this-is-a-badly-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.pop()).toMatch('does not match handler name');

            // Without path but with handler
            fn = {
                name: 'thisIsABadlyNamedFunction',
                handler: "this-is-a-badly-named-example.handler",
                events: []
            };

            errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.pop()).toMatch('does not match handler name');

            // Without path and handler
            fn = {
                name: 'thisIsABadlyNamedFunction',
                handler: "this-is-a-badly-named-example",
                events: []
            };

            errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.pop()).toMatch('does not match handler name');
        });

        test('Correct handler and function name', async () => {
            // With path and .handler
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'thisIsAWellNamedExample',
                handler: "src/this-is-a-well-named-example.handler",
                events: []
            };

            let errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.length).toBe(0);

            // Without path but with handler
            fn = {
                name: 'thisIsAWellNamedExample',
                handler: "this-is-a-well-named-example.handler",
                events: []
            };

            errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.length).toBe(0);

            // Without path and handler
            // Note that although a handler extension is required to be valid
            // this function does not check that and therefore should return no errors
            fn = {
                name: 'thisIsAWellNamedExample',
                handler: "this-is-a-well-named-example",
                events: []
            };

            errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
            expect(errors.length).toBe(0);
        });
    });
});
