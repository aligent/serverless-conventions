import Serverless from "serverless";
import { Options } from "serverless";
import chalk from 'chalk';
import { camelCase, paramCase as kebabCase, snakeCase } from "change-case";
import Aws from "serverless/plugins/aws/provider/awsProvider";


export class ServerlessConventions {
     serverless: Serverless;
     hooks: { [key: string]: Function }
     config: any
     options: Options

     constructor(serverless: Serverless, options: Options) {
          this.serverless = serverless;
          this.options = options;
          this.config = '';

          this.hooks = {
               'before:package:compileFunctions': this.initialize.bind(this)
          };
     }

     initialize() {
          // Check that all the conventions are followed and build a list of errors
          let errors: Array<string> = []
          const functionNames = this.serverless.service.getAllFunctions();
          functionNames.forEach(fnName => {
               const fn = this.serverless.service.getFunction(fnName) as Serverless.FunctionDefinitionHandler;

               errors = errors.concat(this.checkHandlerName(fn));
               errors = errors.concat(this.checkFunctionName(fn));
               errors = errors.concat(this.checkHandlerNameMatchesFunction(fn));
          });

          // Loop through all the resources and run checks as required
          const resources : Aws.CloudFormationResources = this.serverless.resources?.Resources;
          for (const resourceKey in resources) {
               const resource = resources[resourceKey];

               // Run different tests depending on the resource type
               if (resource.Type === 'AWS::DynamoDB::Table') {
                    errors = errors.concat(this.checkDynamoDBTableName(resource));
               }
          }

          // If there were errors detected, print out a list and throw an error
          if (errors.length !== 0) {
               errors.forEach(error => {
                    this.serverless.cli.log(chalk.red(error));
               });
               
               throw Error('Serverless conventions validation failed');
          }
          
          this.serverless.cli.log(chalk.green('Function check complete! No errors were found.'));
     }

     // Handler name conventions
     // Must be kebab-case (dash delimited)
     // Must end in .handler
     checkHandlerName(fn: Serverless.FunctionDefinitionHandler) : Array<string> {
          let errors : Array<string> = [];

          // Get the full handler name (including path)
          const handlerFullPath = fn.handler as string;
          // Get the handler name with file extension but no path
          const handlerName = handlerFullPath.split('/').pop() as string;
          // Get the handler name with no path and no file extension
          const handlerNameNoExtension = handlerName.replace('.handler', '') as string;

          // Check that the handler name is in kebab case
          if (handlerNameNoExtension !== kebabCase(handlerNameNoExtension)) {
               errors.push(`Warning: Handler "${handlerName}" is not kebab case (dash delimited)`);
          }

          // Check that the handler ends in .handler
          if (handlerNameNoExtension === handlerName) {
               errors.push(`Warning: Handler "${handlerName}" does not end in ".handler"`);
          }

          return errors;
     }

     // Function name conventions
     // Must be camelCase
     checkFunctionName(fn: Serverless.FunctionDefinitionHandler) : Array<string> {
          let errors : Array<string> = [];
          // Get the function name and strip the service name and stage from it
          const fnName = fn.name?.split(this.serverless.service.provider.stage + "-").pop() as string;

          // Check that the function name is in camel case
          if (fnName !== camelCase(fnName)) {
               errors.push(`Warning: Function "${fnName}" is not camel case`);
          }

          return errors;
     }

     // Function / handler name conventions
     // Handler names must have the same name as the function
     checkHandlerNameMatchesFunction(fn: Serverless.FunctionDefinitionHandler) : Array<string> {
          let errors : Array<string> = [];
          // Get the function name and strip the service name and stage from it
          const fnName = fn.name?.split(this.serverless.service.provider.stage + "-").pop() as string;

          // Get handler name removing any path and the .handler extension
          const handler = fn.handler.split('/').pop()?.replace('.handler', '') as string;

          // Create an error if the function does not match the handler name
          if (camelCase(fnName) !== camelCase(handler) && kebabCase(fnName) !== kebabCase(handler)) {
               errors.push(`Warning: Function "${fnName}" does not match handler name "${handler}.handler"`);
          }

          return errors;
     }

     // DynamoDB table name validation
     // DynamoDB table names should be in snake case
     checkDynamoDBTableName(dynamodb: Aws.CloudFormationResource) : Array<string> {
          let errors : Array<string> = [];

          // Get the table name
          const tableName = dynamodb.Properties['tableName'] as string;

          // Check that the function name is in snake case
          if (tableName !== snakeCase(tableName)) {
               errors.push(`Warning: DynamoDB table name "${tableName}" is not snake case`);
          }

          return errors;
     }
}
