import Serverless from 'serverless';
import type ServerlessPlugin from 'serverless/classes/Plugin';
import { CloudFormationResource } from 'serverless/plugins/aws/provider/awsProvider';
import ServerlessConventions from '../src/index';
import { ServerlessClasses } from '../src/type';

function formatServiceName(
  name: string,
  instance: Serverless | ServerlessConventions
): string {
  const service =
    'serverless' in instance ? instance.serverless.service : instance.service;

  return [service.getServiceName(), service.provider.stage, name].join('-');
}

function createExampleServerless(stage = 'tst'): ServerlessClasses {
  const options: Serverless.Options = {
    stage,
    region: 'ap-southeast-2',
  };

  // Log any cli events to jest
  const cli = {
    log: jest.fn(),
  };

  let serverless: ServerlessClasses = new Serverless({ options, commands: [] });

  serverless.cli = cli;
  serverless.service.provider.stage = stage;
  serverless.service.initialServerlessConfig = {};
  // Return a service name
  serverless.service.getServiceName = jest.fn().mockReturnValue('test-name');
  // Set some basic provider information
  serverless.service.provider = {
    compiledCloudFormationTemplate: {
      Resources: {},
    },
    name: 'aws',
    stage: 'tst',
    region: 'ap-southeast-2',
    versionFunctions: false,
    runtime: 'nodejs14.x',
  } as any;
  serverless.service.custom.esbuild = {
    target: 'node14',
  };

  // Create some example resources
  const resource: CloudFormationResource = {
    Type: 'AWS::DynamoDB::Table',
    Properties: {
      tableName: 'test-name-good-table-name',
    },
  };
  serverless.resources = {
    Resources: { db: resource },
  };

  // A good function and handler name
  let fn: Serverless.FunctionDefinitionHandler = {
    name: formatServiceName('thisIsAWellNamedFunction', serverless),
    handler: 'src/this-is-a-well-named-function.handler',
    events: [],
  };

  serverless.service.getAllFunctions = jest
    .fn()
    .mockReturnValue([
      formatServiceName('thisIsAWellNamedFunction', serverless),
    ]);
  serverless.service.getFunction = jest.fn().mockReturnValue(fn);

  return serverless;
}

function createServerlessConvention(
  stage = 'tst',
  serverlessIn?: ServerlessClasses
): ServerlessConventions {
  // Create a valid serverless instance
  const serverless = serverlessIn || createExampleServerless(stage);
  const options: Serverless.Options = {
    stage,
    region: 'ap-southeast-2',
  };
  const log: ServerlessPlugin.Logging['log'] = {
    error: () => {},
    warning: () => {},
    notice: () => {},
    info: () => {},
    debug: () => {},
    verbose: () => {},
    success: () => {},
  };

  // Create a serverless conventions instance
  const ServerlessConvention: ServerlessConventions = new ServerlessConventions(
    serverless,
    options,
    { log }
  );

  ServerlessConvention.initialize();

  return ServerlessConvention;
}

describe('Test conventions plugin', () => {
  describe('Integration test', () => {
    test('Initialize function valid serverless.yml', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Run the initialize function
      expect(() => {
        ServerlessConvention.runConventionCheck();
      }).not.toThrowError();
    });

    test('Initialize function valid serverless.yml without resources', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Remove all resources from serverless
      ServerlessConvention.serverless.resources = { Resources: {} };

      // Run the initialize function
      expect(() => {
        ServerlessConvention.runConventionCheck();
      }).not.toThrowError();
    });

    test('Initialize function invalid serverless.yml', async () => {
      let serverless = createExampleServerless();
      // Invalid service name
      serverless.service.getServiceName = jest
        .fn()
        .mockReturnValue('test-service');

      // Bad function and handler name
      let fn: Serverless.FunctionDefinitionHandler = {
        name: 'ThisIsABadlyNamedFunction',
        handler: 'src/this-is-a-badly-named-example',
        events: [],
      };

      // Bad database name
      const resource: CloudFormationResource = {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          tableName: 'BadTableName',
        },
      };

      serverless.resources = {
        Resources: { db: resource },
      };

      serverless.service.getAllFunctions = jest
        .fn()
        .mockReturnValue([
          formatServiceName('ThisIsABadlyNamedFunction', serverless),
        ]);
      serverless.service.getFunction = jest.fn().mockReturnValue(fn);

      // Create another serverless instance with bad data
      // const BadServerlessConvention = new ServerlessConventions(serverless, {
      //   stage: 'BadStageName',
      //   region: 'ap-southeast-2',
      // });
      const BadServerlessConvention = createServerlessConvention(
        'BadStageName',
        serverless
      );
      // Run the initialize function
      expect(() => {
        BadServerlessConvention.runConventionCheck();
      }).toThrowError();
    });

    test('Initialize function with all ignore fields set to true', async () => {
      let ServerlessConvention = createServerlessConvention();
      ServerlessConvention.conventionsConfig = {
        ignore: {
          serviceName: true,
          stageName: true,
          handlerName: true,
          functionName: true,
          handlerNameMatchesFunction: true,
          dynamoDBTableName: true,
        },
      };

      expect(() => {
        ServerlessConvention.runConventionCheck();
      }).not.toThrowError();
    });

    test('Initialize function with no ignore fields', async () => {
      let ServerlessConvention = createServerlessConvention();
      ServerlessConvention.conventionsConfig = {
        ignore: {},
      };

      expect(() => {
        ServerlessConvention.runConventionCheck();
      }).not.toThrowError();
    });

    test('Initialize function ignore stage name check', async () => {
      let ServerlessConvention =
        createServerlessConvention('NotAGoodStageName');

      // Ignore stage name check
      ServerlessConvention.conventionsConfig.ignore.stageName = true;

      expect(() => {
        ServerlessConvention.runConventionCheck();
      }).not.toThrowError();
    });

    test('Initialize function ignore handler name check', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Ignore the service name check
      ServerlessConvention.conventionsConfig.ignore.handlerNameMatchesFunction =
        true;

      // Handler does not match function name (this should be ignored so test should still pass)
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'thisIsAWellNamedFunction',
          ServerlessConvention
        ),
        handler: 'src/this-is-a-badly-named-function.handler',
        events: [],
      };

      ServerlessConvention.serverless.service.getAllFunctions = jest
        .fn()
        .mockReturnValue([
          formatServiceName('thisIsAWellNamedFunction', ServerlessConvention),
        ]);
      ServerlessConvention.serverless.service.getFunction = jest
        .fn()
        .mockReturnValue(fn);

      expect(() => {
        ServerlessConvention.initialize();
      }).not.toThrowError();
    });
  });

  describe('Test service name checker', () => {
    test('Incorrect service name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Not kebab case
      ServerlessConvention.serverless.service.getServiceName = function () {
        return 'testName';
      };
      let errors = ServerlessConvention.checkServiceName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('is not kebab case');

      // No word "service" in the name
      ServerlessConvention.serverless.service.getServiceName = function () {
        return 'test-service';
      };
      errors = ServerlessConvention.checkServiceName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('not include the word "service"');

      // Both not kebab case and word "service" in the name
      ServerlessConvention.serverless.service.getServiceName = function () {
        return 'testService';
      };
      errors = ServerlessConvention.checkServiceName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('not include the word "service"');
      expect(errors.pop()).toMatch('is not kebab case');

      // Longer than 23 characters
      ServerlessConvention.serverless.service.getServiceName = function () {
        return 'thisnameisverylongitshouldnotbethislongorelseitwontbeavalidname';
      };
      errors = ServerlessConvention.checkServiceName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('must be less than 23 characters');
    });

    test('Correct service name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Valid service name
      ServerlessConvention.serverless.service.getServiceName = function () {
        return 'test-name';
      };
      let errors = ServerlessConvention.checkServiceName(
        ServerlessConvention.serverless.service
      );
      expect(errors.length).toBe(0);
    });
  });

  describe('Test stage name checker', () => {
    test('Incorrect stage name', async () => {
      let ServerlessConvention = createServerlessConvention();

      // Not in lower case
      ServerlessConvention.serverless.service.provider.stage = 'Dev';
      let errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch(
        'only contain alphabet characters in lower case'
      );

      // Contains non-alphabet character
      ServerlessConvention.serverless.service.provider.stage = '5tg';
      errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch(
        'only contain alphabet characters in lower case'
      );

      // Longer than 3 characters
      ServerlessConvention.serverless.service.provider.stage = 'test';
      errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('must be 3 characters long');

      // Shorter than 3 characters
      ServerlessConvention.serverless.service.provider.stage = 't';
      errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('must be 3 characters long');

      // Both not lower case alphabets only and not 3 characters in length
      ServerlessConvention.serverless.service.provider.stage = 'testService';
      errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );
      expect(errors.pop()).toMatch('must be 3 characters long');
      expect(errors.pop()).toMatch(
        'only contain alphabet characters in lower case'
      );
    });

    test('Correct stage name', async () => {
      let ServerlessConvention = createServerlessConvention();

      ServerlessConvention.serverless.service.provider.stage = 'prd';
      let errors = ServerlessConvention.checkStageName(
        ServerlessConvention.serverless.service
      );

      expect(errors.length).toBe(0);
    });
  });

  describe('Test handler name checker', () => {
    test('Incorrect handler name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Not kebab case
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'thisIsABadlyNamedExample',
          ServerlessConvention
        ),
        handler: 'src/This-is-a-badly-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkHandlerName(fn);
      expect(errors.pop()).toMatch('is not kebab case');

      fn = {
        name: 'thisIsABadlyNamedFunction',
        handler: 'src/thisIsABadlyNamedExample.handler',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerName(fn);
      expect(errors.pop()).toMatch('is not kebab case');

      // No ".handler" extension
      fn = {
        name: 'thisIsABadlyNamedFunction',
        handler: 'this-is-a-badly-named-example',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerName(fn);
      expect(errors.pop()).toMatch('does not end in ".handler"');

      // No ".handler" extension and not kebab case
      fn = {
        name: 'thisIsABadlyNamedFunction',
        handler: 'This-is-a-badly-named-example',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerName(fn);
      expect(errors.pop()).toMatch('does not end in ".handler"');
      expect(errors.pop()).toMatch('is not kebab case');
    });

    test('Correct handler name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Handler name should be in kebab case with .handler extension
      let fn: Serverless.FunctionDefinitionHandler = {
        name: 'thisIsAWellNamedExample',
        handler: 'src/this-is-a-well-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkHandlerName(fn);
      expect(errors.length).toBe(0);
    });
  });

  describe('Test function name checker', () => {
    test('Incorrect function name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Kebab case
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'this-is-a-badly-named-example',
          ServerlessConvention
        ),
        handler: 'src/this-is-a-badly-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkFunctionName(fn);
      expect(errors.pop()).toMatch('is not camel case');

      // Capitalising first letter
      fn = {
        name: formatServiceName(
          'ThisIsABadlyNamedFunction',
          ServerlessConvention
        ),
        handler: 'this-is-a-badly-named-example.handler',
        events: [],
      };

      errors = ServerlessConvention.checkFunctionName(fn);
      expect(errors.pop()).toMatch('is not camel case');
    });

    test('Correct function name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // Function name should be in camel case
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'thisIsAWellNamedExample',
          ServerlessConvention
        ),
        handler: 'src/this-is-a-well-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkFunctionName(fn);
      expect(errors.length).toBe(0);
    });
  });

  describe('Test handler name matches function check', () => {
    test('Incorrect handler and function name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // With path and .handler
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'thisIsABadlyNamedFunction',
          ServerlessConvention
        ),
        handler: 'src/this-is-a-badly-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.pop()).toMatch('does not match handler name');

      // Without path but with handler
      fn = {
        name: formatServiceName(
          'thisIsABadlyNamedFunction',
          ServerlessConvention
        ),
        handler: 'this-is-a-badly-named-example.handler',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.pop()).toMatch('does not match handler name');

      // Without path and handler
      fn = {
        name: formatServiceName(
          'thisIsABadlyNamedFunction',
          ServerlessConvention
        ),
        handler: 'this-is-a-badly-named-example',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.pop()).toMatch('does not match handler name');
    });

    test('Correct handler and function name', async () => {
      let ServerlessConvention = createServerlessConvention();
      // With path and .handler
      let fn: Serverless.FunctionDefinitionHandler = {
        name: formatServiceName(
          'thisIsAWellNamedExample',
          ServerlessConvention
        ),
        handler: 'src/this-is-a-well-named-example.handler',
        events: [],
      };

      let errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.length).toBe(0);

      // Without path but with handler
      fn = {
        name: formatServiceName(
          'thisIsAWellNamedExample',
          ServerlessConvention
        ),
        handler: 'this-is-a-well-named-example.handler',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.length).toBe(0);

      // Without path and handler
      // Note that although a handler extension is required to be valid
      // this function does not check that and therefore should return no errors
      fn = {
        name: formatServiceName(
          'thisIsAWellNamedExample',
          ServerlessConvention
        ),
        handler: 'this-is-a-well-named-example',
        events: [],
      };

      errors = ServerlessConvention.checkHandlerNameMatchesFunction(fn);
      expect(errors.length).toBe(0);
    });
  });

  describe('Test DynamoDB table name checker', () => {
    test('Incorrect table name', async () => {
      let ServerlessConvention = createServerlessConvention();
      ServerlessConvention.serverless.service.getServiceName = jest
        .fn()
        .mockReturnValue('test-name');
      // DynamoDB table name should be in snake case
      let resource: CloudFormationResource = {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          tableName: 'test-name-bad_table_name',
        },
      };

      let errors = ServerlessConvention.checkDynamoDBTableName(
        resource,
        ServerlessConvention.serverless.service.getServiceName()
      );
      expect(errors.pop()).toMatch('is not kebab case');

      // DynamoDB table name should be in snake case and start with the service name
      resource = {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          tableName: 'Bad_table_name',
        },
      };

      errors = ServerlessConvention.checkDynamoDBTableName(
        resource,
        ServerlessConvention.serverless.service.getServiceName()
      );
      expect(errors.pop()).toMatch('is not kebab case');
      expect(errors.pop()).toMatch('does not start with the service name');

      // DynamoDB table name should start with the service name
      resource = {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          tableName: 'bad-table-name',
        },
      };

      errors = ServerlessConvention.checkDynamoDBTableName(
        resource,
        ServerlessConvention.serverless.service.getServiceName()
      );
      expect(errors.pop()).toMatch('does not start with the service name');
    });

    test('Correct table name', async () => {
      let ServerlessConvention = createServerlessConvention();
      ServerlessConvention.serverless.service.getServiceName = jest
        .fn()
        .mockReturnValue('test-name');

      // DynamoDB table name should be in snake case
      const resource: CloudFormationResource = {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          tableName: 'test-name-good-table-name',
        },
      };

      let errors = ServerlessConvention.checkDynamoDBTableName(
        resource,
        ServerlessConvention.serverless.service.getServiceName()
      );
      expect(errors.length).toBe(0);
    });
  });

  describe('Test node version', () => {
    test('Different node versions', async () => {
      let ServerlessConvention = createServerlessConvention();

      let errors = ServerlessConvention.checkNodeVersion(
        'nodejs14.x',
        'node12'
      );
      expect(errors.pop()).toMatch('does not match esbuild node version');
    });

    test('Same node version', async () => {
      let ServerlessConvention = createServerlessConvention();

      let errors = ServerlessConvention.checkNodeVersion(
        'nodejs14.x',
        'node14'
      );
      expect(errors.length).toBe(0);
    });
  });
});
