

import { defineConfig } from 'orval';


export default defineConfig({

    'octomind': {
        input: {
            target: "https://app.octomind.dev/openapi.yaml",
        },
        output: {
            client: 'zod',
            mode: 'single',
            target: './src/schemas',
        },
    },
});