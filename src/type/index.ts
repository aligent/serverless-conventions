import Serverless from 'serverless';

interface ServerlessError extends Error {
  code: string;
}

export interface ServerlessErrorConstructor {
  new (message?: string): ServerlessError;
  (message?: string): ServerlessError;
  readonly prototype: ServerlessError;
}

export interface ServerlessClasses extends Serverless {
  classes?: { Error: ServerlessErrorConstructor };
}

export type ConventionsConfig = {
  ignore: {
    serviceName?: boolean;
    stageName?: boolean;
    handlerName?: boolean;
    functionName?: boolean;
    handlerNameMatchesFunction?: boolean;
    dynamoDBTableName?: boolean;
  };
};
