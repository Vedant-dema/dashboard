@description('Deployment environment name.')
param environment string = 'dev'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Project/application short name used in resource naming.')
param projectName string = 'dema'

// NOTE:
// This is a starter skeleton for the post-deployment hardening milestone.
// Resource modules are intentionally not implemented yet to keep this pass docs-first and reviewable.

output plannedEnvironment string = environment
output plannedLocation string = location
output plannedProjectName string = projectName
