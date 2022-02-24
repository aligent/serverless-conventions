# Serverless Conventions Plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/@aligent%2Fserverless-conventions.svg)](https://badge.fury.io/js/@aligent%2Fserverless-conventions)

A [Serverless framework](https://www.serverless.com) plugin to enforce various formatting conventions to maintain consistency within Serverless applications.

## List of conventions
| Convention | Good Example | Bad Example |
| --- | --- | --- |
| Service name must be dash delimited | this-is-a-good-name | thisIsABadName |
| Service name must not contain the word "service" | this-is-a-good-name | this-is-a-bad-service | 
| Handler names must have the same name as the function | functions:<br>&nbsp;thisIsAWellNamedExample:<br>&nbsp;&nbsp;handler: src/this-is-a-well-named-example.handler | functions:<br>&nbsp;thisIsABadlyNamedFunction:<br>&nbsp;&nbsp;handler: src/this-is-a-badly-named-example.handler |
| Function names must be in camel case | thisIsAWellNamedExample | ThisIsABadlyNamedExample |
| Handler names must be dash delimited | src/this-is-a-well-named-example.handler | src/ThisIsABadlyNamedExample.handler |
| Handler names must end in ".handler" | src/this-is-a-well-named-example.handler | src/this-is-a-badly-named-example |
| DynamoDB table names must be in kebab case | example-name-good-table-name | BadTableName |
| DynamoDB table names must start with the service name | example-name-good-table-name | bad-table-name |

## Serverless configuration
The plugin is configured within the `serverless.yaml` by adding the plugin to the list of plugins.

```
plugins:
  - "@aligent/serverless-conventions"
```

## Running the conventions check
The conventions check will run automatically each time you run a serverless command that compiles the packages. (e.g. `serverless package`, `serverless deploy`)

Alternatively, the conventions check can be run manually with `serverless conventions-check`.

## Example Output
![serverless output](/images/serverless_output.png)