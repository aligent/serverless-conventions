import {ServerlessConventions} from "../src/index";
import Serverless from "serverless";

describe('Test conventions plugin', () => {
    const options : Serverless.Options = {
        stage: 'test',
        region: 'ap-southeast-2',
    };

    // Log any cli events to jest
    const cli = {
        log: jest.fn(),
    }

    // Create a valid serverless instance 
    const serverless : Serverless = new Serverless({options});
    serverless.cli = cli;
    serverless.service.provider.stage = 'test';
    // Return a service name
    serverless.service.getServiceName = jest.fn().mockReturnValue('test-name');
    // Set some basic provider information
    serverless.service.provider = {
        compiledCloudFormationTemplate: {
            Resources: {}
        },
        name: 'aws',
        stage: 'test',
        region: 'ap-southeast-2',
        versionFunctions: false
    }

    // A good function and handler name
    let fn : Serverless.FunctionDefinitionHandler = {
        name: 'thisIsAWellNamedFunction',
        handler: "src/this-is-a-well-named-function.handler",
        events: []
    };

    serverless.service.getAllFunctions = jest.fn().mockReturnValue(['thisIsAWellNamedFunction']);
    serverless.service.getFunction = jest.fn().mockReturnValue(fn);

    // Create a serverless conventions instance
    const ServerlessConvention: ServerlessConventions = new ServerlessConventions(
        serverless, options
    );

    describe('Integration test', () => {
        test('Initialize function valid serverless.yml', async () => {
            // Run the initialize function
            expect(() => { 
                ServerlessConvention.initialize()
            }).not.toThrowError();
        });

        test('Initialize function invalid serverless.yml', async () => {
            // Invalid service name
            serverless.service.getServiceName = jest.fn().mockReturnValue('test-service');

            // Bad function and handler name
            let fn : Serverless.FunctionDefinitionHandler = {
                name: 'ThisIsABadlyNamedFunction',
                handler: "src/this-is-a-badly-named-example",
                events: []
            };

            serverless.service.getAllFunctions = jest.fn().mockReturnValue(['ThisIsABadlyNamedFunction']);
            serverless.service.getFunction = jest.fn().mockReturnValue(fn);

            // Create another serverless instance with bad data
            const BadServerlessConvention: ServerlessConventions = new ServerlessConventions(
                serverless, options
            );
            // Run the initialize function
            expect(() => { 
                BadServerlessConvention.initialize()
            }).toThrowError();
        });
    });

    describe('Test service name checker', () => {
        test('Incorrect service name', async () => {
            // Not kebab case
            serverless.service.getServiceName = function () { return 'testName' };
            let errors = ServerlessConvention.checkServiceName(serverless.service);
            expect(errors.pop()).toMatch('is not kebab case');

            // No word "service" in the name
            serverless.service.getServiceName = function () { return 'test-service' };
            errors = ServerlessConvention.checkServiceName(serverless.service);
            expect(errors.pop()).toMatch('not include the word "service"');

            // Both not kebab case and word "service" in the name
            serverless.service.getServiceName = function () { return 'testService' };
            errors = ServerlessConvention.checkServiceName(serverless.service);
            expect(errors.pop()).toMatch('not include the word "service"');
            expect(errors.pop()).toMatch('is not kebab case');
        });

        test('Correct service name', async () => {
            // Valid service name
            serverless.service.getServiceName = function () { return 'test-name' };
            let errors = ServerlessConvention.checkServiceName(serverless.service);
            expect(errors.length).toBe(0);
        });
    });

    describe('Test cloudformation validation checker', () => {
        test('Cloud formation service role does not exist', async () => {
            // Does not exist
            

            let errors = ServerlessConvention.checkIAMDeploymentRole(serverless.service);
            expect(errors.pop()).toMatch('must contain a cloud formation service role');
        });

        test('Cloud formation service role exists', async () => {
            // Exists


            let errors = ServerlessConvention.checkIAMDeploymentRole(serverless.service);
            expect(errors.length).toBe(0);
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
