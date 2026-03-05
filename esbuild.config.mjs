import { build } from 'esbuild';
import esbuildPluginLicense from 'esbuild-plugin-license';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.js',
  plugins: [
    esbuildPluginLicense({
      thirdParty: {
        output: {
          file: 'dist/licenses.txt',
          template(dependencies) {
            return dependencies
              .map(
                dep =>
                  `${dep.packageJson.name}@${dep.packageJson.version}\n${dep.licenseText || dep.packageJson.license || 'N/A'}`
              )
              .join('\n\n---\n\n');
          }
        }
      }
    })
  ]
});
