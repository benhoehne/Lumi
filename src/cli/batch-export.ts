#!/usr/bin/env node

/**
 * Lumi H5P Batch Export CLI
 *
 * A standalone command-line tool for batch exporting H5P files to SCORM and HTML formats
 * without requiring the Electron GUI.
 *
 * Usage:
 *   npm run batch-export -- --input ./h5p-files --output ./exports --format scorm
 *   npm run batch-export -- --input ./h5p-files --output ./exports --format external --masteryScore 80
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';
import exportH5P from '../ops/export-h5p';
import getUbernameFromH5pJson from '../ops/get_ubername_from_h5p_json';
import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import H5PConfig from '../../config/h5p-config';
import User from '../models/User';

interface CLIOptions {
    input: string;
    output: string;
    format: 'scorm' | 'external' | 'both';
    masteryScore?: number;
    cssPath?: string;
    language?: string;
    marginX?: number;
    marginY?: number;
    maxWidth?: number;
    restrictWidthAndCenter?: boolean;
    showEmbed?: boolean;
    showRights?: boolean;
}

interface ExportContext {
    h5pEditor: H5P.H5PEditor;
    translate: (key: string) => string;
    paths: {
        settings: string;
        content: string;
        libraries: string;
        app: string;
        tmp: string;
    };
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: any = {
        format: 'both',
        language: 'en',
        masteryScore: 75,
        marginX: 0,
        marginY: 20,
        maxWidth: 1200,
        restrictWidthAndCenter: true,
        showEmbed: false,
        showRights: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--input':
            case '-i':
                options.input = nextArg;
                i++;
                break;
            case '--output':
            case '-o':
                options.output = nextArg;
                i++;
                break;
            case '--format':
            case '-f':
                if (!['scorm', 'external', 'both'].includes(nextArg)) {
                    throw new Error('Format must be: scorm, external, or both');
                }
                options.format = nextArg;
                i++;
                break;
            case '--masteryScore':
            case '-m':
                options.masteryScore = parseInt(nextArg, 10);
                i++;
                break;
            case '--css':
            case '-c':
                options.cssPath = nextArg;
                i++;
                break;
            case '--language':
            case '-l':
                options.language = nextArg;
                i++;
                break;
            case '--marginX':
                options.marginX = parseInt(nextArg, 10);
                i++;
                break;
            case '--marginY':
                options.marginY = parseInt(nextArg, 10);
                i++;
                break;
            case '--maxWidth':
                options.maxWidth = parseInt(nextArg, 10);
                i++;
                break;
            case '--restrictWidth':
                options.restrictWidthAndCenter = true;
                break;
            case '--hideEmbed':
                options.showEmbed = false;
                break;
            case '--hideRights':
                options.showRights = false;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            default:
                if (arg.startsWith('-')) {
                    // Provide helpful error for common mistakes
                    if (arg === '--i') {
                        throw new Error(`Unknown option: ${arg}. Did you mean -i or --input?`);
                    }
                    if (arg === '--o') {
                        throw new Error(`Unknown option: ${arg}. Did you mean -o or --output?`);
                    }
                    if (arg === '--f') {
                        throw new Error(`Unknown option: ${arg}. Did you mean -f or --format?`);
                    }
                    if (arg === '--m') {
                        throw new Error(`Unknown option: ${arg}. Did you mean -m or --masteryScore?`);
                    }
                    throw new Error(`Unknown option: ${arg}. Use --help for usage information.`);
                }
        }
    }

    if (!options.input) {
        throw new Error('--input is required');
    }
    if (!options.output) {
        throw new Error('--output is required');
    }

    return options as CLIOptions;
}

/**
 * Print help message
 */
function printHelp(): void {
    console.log(`
Lumi H5P Batch Export CLI

Usage:
  npm run batch-export -- [options]

Required Options:
  -i, --input <path>          Input directory containing H5P files
  -o, --output <path>         Output directory for exported files

Optional Options:
  -f, --format <type>         Export format: scorm, external, or both (default: both)
  -m, --masteryScore <score>  SCORM mastery score 0-100 (default: 75)
  -c, --css <path>            Path to custom CSS file
  -l, --language <code>       Language code (default: en)
  --marginX <pixels>          Horizontal margin (default: 0)
  --marginY <pixels>          Vertical margin (default: 0)
  --maxWidth <pixels>         Maximum content width (default: 800)
  --restrictWidth             Restrict width and center content
  --hideEmbed                 Hide embed button
  --hideRights                Hide copyright information
  -h, --help                  Show this help message

Examples:
  # Export all H5P files to SCORM
  npm run batch-export -- --input ./h5p-files --output ./exports --format scorm

  # Export to HTML external with custom mastery score
  npm run batch-export -- --input ./h5p-files --output ./exports --format external --masteryScore 80

  # Export to both formats with custom CSS
  npm run batch-export -- --input ./h5p-files --output ./exports --format both --css ./custom.css
`);
}

/**
 * Initialize H5P infrastructure without Electron
 */
async function initializeH5P(): Promise<ExportContext> {
    console.log('Initializing H5P infrastructure...');

    // Setup paths
    // When running from build/src/cli/batch-export.js, we need to go up to project root
    const appPath = path.resolve(__dirname, '../../..');
    const userDataPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.lumi-cli');
    const settingsPath = path.join(userDataPath, 'settings.json');
    const contentPath = path.join(userDataPath, 'content');
    const librariesPath = path.join(appPath, 'assets', 'h5p', 'libraries');
    const tmpPath = path.join(userDataPath, 'tmp');

    // Ensure directories exist
    await fs.ensureDir(userDataPath);
    await fs.ensureDir(contentPath);
    await fs.ensureDir(tmpPath);

    // Initialize i18n
    await i18next
        .use(Backend)
        .init({
            backend: {
                loadPath: path.join(appPath, 'assets', 'translations', 'lumi', '{{lng}}.json')
            },
            debug: false,
            fallbackLng: 'en',
            lng: 'en',
            saveMissing: false
        });

    // Create H5P storages
    const libraryStorage = new H5P.fsImplementations.FileLibraryStorage(librariesPath);
    const contentStorage = new H5P.fsImplementations.FileContentStorage(contentPath);
    const temporaryFileStorage = new H5P.fsImplementations.DirectoryTemporaryFileStorage(tmpPath);

    // Create H5P config instance
    const config = new H5PConfig();

    // Create H5P editor
    const h5pEditor = new H5P.H5PEditor(
        new H5P.fsImplementations.InMemoryStorage(),
        config,
        new H5P.cacheImplementations.CachedLibraryStorage(libraryStorage),
        contentStorage,
        temporaryFileStorage,
        (key: string) => i18next.t(key),
        undefined,
        {
            customization: {
                global: {
                    styles: []
                }
            },
            enableHubLocalization: true,
            enableLibraryNameLocalization: true
        }
    );

    h5pEditor.setRenderer((model) => model);

    const context: ExportContext = {
        h5pEditor,
        translate: (key: string) => i18next.t(key),
        paths: {
            settings: settingsPath,
            content: contentPath,
            libraries: librariesPath,
            app: appPath,
            tmp: tmpPath
        }
    };

    console.log('H5P infrastructure initialized successfully\n');
    return context;
}

/**
 * Find all H5P files in a directory
 */
async function findH5PFiles(inputDir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(inputDir);

    for (const entry of entries) {
        const fullPath = path.join(inputDir, entry);
        const stat = await fs.stat(fullPath);

        if (stat.isFile() && entry.toLowerCase().endsWith('.h5p')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Import H5P file and return content ID
 */
async function importH5PFile(
    context: ExportContext,
    filePath: string
): Promise<string> {
    console.log(`  Importing: ${path.basename(filePath)}`);

    const fileBuffer = await fs.readFile(filePath);
    const user = new User();

    // Upload and install the package
    const result = await context.h5pEditor.uploadPackage(
        fileBuffer,
        user
    );

    // Save content
    const contentId = await context.h5pEditor.saveOrUpdateContent(
        undefined,
        result.parameters,
        result.metadata,
        getUbernameFromH5pJson(result.metadata),
        user
    );

    console.log(`  Content ID: ${contentId}`);
    return contentId;
}

/**
 * Export content to specified format
 */
async function exportContent(
    context: ExportContext,
    contentId: string,
    outputPath: string,
    format: 'scorm' | 'external',
    options: CLIOptions
): Promise<void> {
    const user = new User();

    const exportOptions = {
        cssPath: options.cssPath,
        format,
        includeReporter: false,
        marginX: options.marginX || 0,
        marginY: options.marginY || 0,
        masteryScore: options.masteryScore || 75,
        maxWidth: options.maxWidth || 800,
        restrictWidthAndCenter: options.restrictWidthAndCenter || false,
        showEmbed: options.showEmbed !== false,
        showRights: options.showRights !== false
    };

    await exportH5P(
        context as any,
        outputPath,
        context.h5pEditor,
        context.translate,
        contentId,
        user,
        options.language || 'en',
        exportOptions
    );

    console.log(`  Exported to: ${outputPath}`);
}

/**
 * Process a single H5P file
 */
async function processFile(
    context: ExportContext,
    filePath: string,
    outputDir: string,
    options: CLIOptions,
    index: number,
    total: number
): Promise<void> {
    const fileName = path.basename(filePath, '.h5p');
    console.log(`\n[${index + 1}/${total}] Processing: ${fileName}`);

    try {
        // Import H5P file
        const contentId = await importH5PFile(context, filePath);

        // Create output subdirectory structure for this file
        const fileOutputDir = path.join(outputDir, fileName);
        await fs.ensureDir(fileOutputDir);

        // Export to requested format(s)
        if (options.format === 'scorm' || options.format === 'both') {
            console.log('  Exporting to SCORM...');
            const scormDir = path.join(fileOutputDir, 'SCORM');
            await fs.ensureDir(scormDir);
            const scormPath = path.join(scormDir, `${fileName}.zip`);
            await exportContent(context, contentId, scormPath, 'scorm', options);
        }

        if (options.format === 'external' || options.format === 'both') {
            console.log('  Exporting to HTML external...');
            const htmlDir = path.join(fileOutputDir, 'HTML');
            await fs.ensureDir(htmlDir);
            const htmlPath = path.join(htmlDir, 'index.html');
            await exportContent(context, contentId, htmlPath, 'external', options);
        }

        // Clean up imported content
        await context.h5pEditor.contentManager.deleteContent(contentId, new User());

        console.log(`  ✓ Completed successfully`);
    } catch (error) {
        console.error(`  ✗ Error processing file:`, error.message);
        console.error(`  Skipping and continuing...`);
    }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        console.log('='.repeat(60));
        console.log('Lumi H5P Batch Export CLI');
        console.log('='.repeat(60));

        // Parse arguments
        const options = parseArgs();

        // Validate input directory
        const inputDir = path.resolve(options.input);
        if (!await fs.pathExists(inputDir)) {
            throw new Error(`Input directory does not exist: ${inputDir}`);
        }

        // Create output directory
        const outputDir = path.resolve(options.output);
        await fs.ensureDir(outputDir);

        console.log(`\nConfiguration:`);
        console.log(`  Input:        ${inputDir}`);
        console.log(`  Output:       ${outputDir}`);
        console.log(`  Format:       ${options.format}`);
        console.log(`  Mastery:      ${options.masteryScore}%`);
        console.log(`  Language:     ${options.language}`);
        if (options.cssPath) {
            console.log(`  Custom CSS:   ${options.cssPath}`);
        }
        console.log('');

        // Initialize H5P
        const context = await initializeH5P();

        // Find H5P files
        console.log('Scanning for H5P files...');
        const h5pFiles = await findH5PFiles(inputDir);

        if (h5pFiles.length === 0) {
            console.log('No H5P files found in input directory.');
            process.exit(0);
        }

        console.log(`Found ${h5pFiles.length} H5P file(s)\n`);

        // Process files sequentially
        for (let i = 0; i < h5pFiles.length; i++) {
            await processFile(context, h5pFiles[i], outputDir, options, i, h5pFiles.length);
        }

        // Clean up temporary files
        console.log('\nCleaning up temporary files...');
        await fs.remove(context.paths.tmp);

        console.log('\n' + '='.repeat(60));
        console.log('Batch export completed!');
        console.log('='.repeat(60));
        console.log(`Total files processed: ${h5pFiles.length}`);
        console.log(`Output directory: ${outputDir}\n`);

    } catch (error) {
        console.error('\nError:', error.message);
        if (error.message.includes('--input') || error.message.includes('--output')) {
            console.log('\nUse --help for usage information');
        }
        process.exit(1);
    }
}

// Run the CLI
if (require.main === module) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { main, parseArgs, initializeH5P, exportContent };
