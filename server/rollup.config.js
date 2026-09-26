import { dts } from 'rollup-plugin-dts';

export default {
    input: 'src/generate-types.ts',
    output: {
        file: '../web/src/domain.d.ts',
        name: 'bundle',
        format: 'iife',
    },
    plugins: [dts()],
};
