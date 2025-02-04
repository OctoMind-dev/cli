# CLI for octomind api

simple cli to call octominds api from command line

npm / npx cli
```
Usage: octomind-cli [options] [command]

Octomind CLI tool

Options:
  -h, --help                     display help for command

Commands:
  execute [options]              Execute test cases
  report [options]               Get test report details
  register-location [options]    Register a private location
  unregister-location [options]  Unregister a private location
  help [command]                 display help for command
```

# example get report

```
octomind-cli tsx src/cli.ts report -k xxxx -t e3ad5xxx-f64c-4fb3-83da-26f3b117e9f7 -r 028f4726-4f49-4d0d-abae-32f32693xxx
Test Report Details:
Status: PASSED
Execution URL: https://example.com

Test Results:
- Test 71854a90-xxxx-4ac8-aa88-90a1e5205e1f: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/c5481e1f-xxxx-48b8-92f9-d8d548887c06-trace.zip
- Test ce29ee7f-xxxx-49b1-93a1-1112886f54ea: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/8d93266b-xxxx-4804-9ebb-f659040cafa2-trace.zip
- Test aada5348-xxxx-46a7-935f-9500aa0a8541: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/4dd46d55-xxxx-41ba-881d-3b11cd34307e-trace.zip
- Test 8f2a4a12-xxxx-4fd6-a1d3-3fabec37391f: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/dbcbd126-xxxx-48ca-97ab-d71f66bc518e-trace.zip
```

# or as json output
```
octomind-cli tsx src/cli.ts report --json -k xxxx -t e3ad5xxx-f64c-4fb3-83da-26f3b117e9f7 -r 028f4726-4f49-4d0d-abae-32f32693xxx
```

```json
{
  "id": "028f4726-4f49-4d0d-abae-32f32693c53b",
  "testTargetId": "e3ad5aa8-f64c-4fb3-83da-26f3b117e9f7",
  "environmentId": "da3b539e-456c-462d-b73f-8e0089af90bd",
  "executionUrl": "https://books.rinke-solutions.com",
  "context": {
    "source": "manual",
    "description": "manual test run",
    "triggeredBy": {
      "type": "USER",
      "userId": "d61e8681-4715-40f2-8651-6d7d2c2de211"
    }
  },
  "createdAt": "2024-11-10T17:11:45.949Z",
  "updatedAt": "2024-11-10T17:11:45.949Z",
  "testResults": [
    {
      "id": "d651f291-5bf1-4614-8013-7fe4a7ea9ca8",
      "testReportId": "028f4726-4f49-4d0d-abae-32f32693c53b",
      "status": "PASSED",
      "createdAt": "2024-11-10T17:11:45.963Z",
      "updatedAt": "2024-11-10T17:13:10.958Z",
      "testCaseId": "71854a90-fba6-4ac8-aa88-90a1e5205e1f",
      "errorMessage": null,
      "traceUrl": "https://storage.googleapis.com/automagically-traces/c5481e1f-15bd-48b8-92f9-d8d548887c06-trace.zip"
    }
  ],
  "status": "PASSED"
}
```
