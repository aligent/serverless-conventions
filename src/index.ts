import Serverless from 'serverless';
import { Options } from 'serverless';
import chalk from 'chalk';
import { camelCase, paramCase as kebabCase } from 'change-case';
import Aws from 'serverless/plugins/aws/provider/awsProvider';
import Service from 'serverless/classes/Service';

type ConventionsConfig = {
  ignore: {
    serviceName?: boolean;
    stageName?: boolean;
    handlerName?: boolean;
    functionName?: boolean;
    handlerNameMatchesFunction?: boolean;
    dynamoDBTableName?: boolean;
  };
};

export default class ServerlessConventions {
  serverless: Serverless;
  hooks: { [key: string]: Function };
  commands: any;
  config: any;
  options: Options;
  conventionsConfig: ConventionsConfig;

  constructor(serverless: Serverless, options: Options) {
    this.serverless = serverless;
    this.options = options;
    this.config = '';

    this.commands = {
      'conventions-check': {
        usage: 'Runs the serverless conventions plugin',
        lifecycleEvents: ['run'],
      },
    };

    this.hooks = {
      'before:package:compileFunctions': this.initialize.bind(this),
      'conventions-check:run': () => this.initialize(),
    };

    this.serverless.configSchemaHandler.defineTopLevelProperty('conventions', {
      type: 'object',
      properties: {
        ignore: { type: 'object' },
      },
    });

    this.conventionsConfig =
      this.serverless.service.initialServerlessConfig.conventions;

    // Make sure ignore is defined to prevent errors being from being thrown when referencing children
    if (this.conventionsConfig === undefined) {
      this.conventionsConfig = {
        ignore: {},
      };
    }
  }

  initialize() {
    // Check that all the conventions are followed and build a list of errors
    let errors: Array<string> = [];

    errors = this.conventionsConfig.ignore.serviceName
      ? errors
      : errors.concat(this.checkServiceName(this.serverless.service));

    errors = this.conventionsConfig.ignore.stageName
      ? errors
      : errors.concat(this.checkStageName(this.serverless.service));

    const functionNames = this.serverless.service.getAllFunctions();
    functionNames.forEach((fnName) => {
      const fn = this.serverless.service.getFunction(
        fnName
      ) as Serverless.FunctionDefinitionHandler;

      errors = this.conventionsConfig.ignore.handlerName
        ? errors
        : errors.concat(this.checkHandlerName(fn));
      errors = this.conventionsConfig.ignore.functionName
        ? errors
        : errors.concat(this.checkFunctionName(fn));
      errors = this.conventionsConfig.ignore.handlerNameMatchesFunction
        ? errors
        : errors.concat(this.checkHandlerNameMatchesFunction(fn));
    });

    // Loop through all the resources and run checks as required
    const resources: Aws.CloudFormationResources =
      this.serverless.resources?.Resources;
    for (const resourceKey in resources) {
      const resource = resources[resourceKey];

      // Run different tests depending on the resource type
      if (resource.Type === 'AWS::DynamoDB::Table') {
        errors = this.conventionsConfig.ignore.dynamoDBTableName
          ? errors
          : errors.concat(
              this.checkDynamoDBTableName(
                resource,
                this.serverless.service.getServiceName()
              )
            );
      }
    }

    // If there is an esbuild config check that the node versions match
    let esbuildConfig = this.serverless.service.custom.esbuild;
    if (esbuildConfig && esbuildConfig.target) {
      errors = errors.concat(
        this.checkNodeVersion(
          this.serverless.service.provider.runtime,
          esbuildConfig.target
        )
      );
    }

    // If there were errors detected, print out a list and throw an error
    if (errors.length !== 0) {
      errors.forEach((error) => {
        this.serverless.cli.log(chalk.red(error));
      });

      throw Error('Serverless conventions validation failed');
    }

    this.serverless.cli.log(
      chalk.green('Conventions check complete! No errors were found.')
    );
  }

  // Service name validation
  // Must be kebab-case (dash delimited)
  // Must not contain the word "service"
  // Must be less 23 or less characters
  checkServiceName(service: Service): Array<string> {
    let errors: Array<string> = [];
    const serviceName = service.getServiceName() as string;

    // Check that the service name is in kebab case
    if (serviceName !== kebabCase(serviceName)) {
      errors.push(
        `Warning: Service name "${serviceName}" is not kebab case (dash delimited)`
      );
    }

    // Check that the service name does not contain the word "service"
    if (serviceName.toLowerCase().includes('service')) {
      errors.push(
        `Warning: Service name "${serviceName}" should not include the word "service"`
      );
    }

    // Check the length of the service name is not greater than x
    if (serviceName.length > 23) {
      errors.push(
        `Warning: Service name "${serviceName}" must be less than 23 characters`
      );
    }

    return errors;
  }

  // Stage name validation
  // Must contain only lower case alphabet characters
  // Must be only 3 characters
  checkStageName(service: Service): Array<string> {
    let errors: Array<string> = [];
    const stageName = service.provider.stage;

    // Check that the stage name contains only lower case alphabet characters (a-z)
    if (stageName.match(/[^a-z]/)) {
      errors.push(
        `Warning: Stage name "${stageName}" should only contain alphabet characters in lower case`
      );
    }

    // Check the length of the stage name is 3 characters
    if (stageName.length !== 3) {
      errors.push(
        `Warning: Stage name "${stageName}" must be 3 characters long`
      );
    }

    return errors;
  }

  // Handler name conventions
  // Must be kebab-case (dash delimited)
  // Must end in .handler
  checkHandlerName(fn: Serverless.FunctionDefinitionHandler): Array<string> {
    let errors: Array<string> = [];

    // Get the full handler name (including path)
    const handlerFullPath = fn.handler as string;
    // Get the handler name with file extension but no path
    const handlerName = handlerFullPath.split('/').pop() as string;
    // Get the handler name with no path and no file extension
    const handlerNameNoExtension = handlerName.replace(
      '.handler',
      ''
    ) as string;

    // Check that the handler name is in kebab case
    if (handlerNameNoExtension !== kebabCase(handlerNameNoExtension)) {
      errors.push(
        `Warning: Handler "${handlerName}" is not kebab case (dash delimited)`
      );
    }

    // Check that the handler ends in .handler
    if (handlerNameNoExtension === handlerName) {
      errors.push(
        `Warning: Handler "${handlerName}" does not end in ".handler"`
      );
    }

    return errors;
  }

  // Function name conventions
  // Must be camelCase
  checkFunctionName(fn: Serverless.FunctionDefinitionHandler): Array<string> {
    let errors: Array<string> = [];
    // Get the function name and strip the service name and stage from it
    const fnName = fn.name
      ?.split(this.serverless.service.provider.stage + '-')
      .pop() as string;

    // Check that the function name is in camel case
    if (fnName !== camelCase(fnName)) {
      errors.push(`Warning: Function "${fnName}" is not camel case`);
    }

    return errors;
  }

  // Function / handler name conventions
  // Handler names must have the same name as the function
  checkHandlerNameMatchesFunction(
    fn: Serverless.FunctionDefinitionHandler
  ): Array<string> {
    let errors: Array<string> = [];
    // Get the function name and strip the service name and stage from it
    const fnName = fn.name
      ?.split(this.serverless.service.provider.stage + '-')
      .pop() as string;

    // Get handler name removing any path and the .handler extension
    const handler = fn.handler
      .split('/')
      .pop()
      ?.replace('.handler', '') as string;

    // Create an error if the function does not match the handler name
    if (
      camelCase(fnName) !== camelCase(handler) &&
      kebabCase(fnName) !== kebabCase(handler)
    ) {
      errors.push(
        `Warning: Function "${fnName}" does not match handler name "${handler}.handler"`
      );
    }

    return errors;
  }

  // DynamoDB table name validation
  // DynamoDB table names should be in snake case
  checkDynamoDBTableName(
    dynamodb: Aws.CloudFormationResource,
    serviceName: string
  ): Array<string> {
    let errors: Array<string> = [];

    // Get the table name
    const tableName = dynamodb.Properties['tableName'] as string;

    // Check it starts with the service name
    const tableNameWithoutService = tableName
      .split(serviceName + '-')
      .pop() as string;

    if (tableName == tableNameWithoutService) {
      errors.push(
        `Warning: DynamoDB table name "${tableName}" does not start with the service name`
      );
    }

    // Check that the function name is in snake case
    if (tableName !== kebabCase(tableName)) {
      errors.push(
        `Warning: DynamoDB table name "${tableName}" is not kebab case`
      );
    }

    return errors;
  }

  // Check the node version in esbuild config matches the one set as the provider runtime
  checkNodeVersion(
    providerVersion: string,
    esBuildVersion: string
  ): Array<string> {
    let errors: Array<string> = [];

    // providerVersion : nodejs14.x
    // esBuildVersion  : node14
    // Compare these two versions and make sure the numbers match
    const versionNumberRegex = /\d+/i;

    const providerVersionNum = providerVersion.match(versionNumberRegex).pop();
    const esBuildVersionNum = esBuildVersion.match(versionNumberRegex).pop();

    if (providerVersionNum !== esBuildVersionNum) {
      errors.push(
        `Warning: Provider node runtime version "${providerVersion}" does not match esbuild node version "${esBuildVersion}"`
      );
    }

    return errors;
  }
}

module.exports = ServerlessConventions;
