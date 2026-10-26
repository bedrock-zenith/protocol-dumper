import type { RolldownOptions } from 'rolldown';

export default {
    external: /^node:/,
    input: {
        'main-dump': 'src/main-dump.ts',
        'main-resolve': 'src/main-resolve.ts',
        'main-move': 'src/main-move.ts'
    },
    output: {
        cleanDir: true,
        minify: false,
        keepNames: true,
        sourcemap: 'inline'
    }
} satisfies RolldownOptions;
