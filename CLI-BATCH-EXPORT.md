# Lumi H5P Batch Export CLI

A standalone command-line tool for batch exporting H5P files to SCORM and HTML formats without requiring the Electron GUI.

## Features

- **Batch Processing**: Export multiple H5P files sequentially
- **Multiple Formats**: Support for SCORM 1.2 and HTML with external media files
- **Configurable Options**: Customize mastery scores, CSS, margins, and more
- **Progress Tracking**: Real-time progress updates for each file
- **Error Handling**: Continues processing even if individual files fail
- **No GUI Required**: Runs entirely from the command line

## Installation

No additional installation is required. The CLI tool uses the existing Lumi dependencies.

## Usage

### Basic Syntax

```bash
npm run batch-export -- --input <input-directory> --output <output-directory> [options]
```

### Required Arguments

- `--input` or `-i`: Directory containing H5P files to process
- `--output` or `-o`: Directory where exported files will be saved

### Optional Arguments

| Argument | Short | Description | Default |
|----------|-------|-------------|---------|
| `--format` | `-f` | Export format: `scorm`, `external`, or `both` | `both` |
| `--masteryScore` | `-m` | SCORM mastery score (0-100) | `75` |
| `--css` | `-c` | Path to custom CSS file | None |
| `--language` | `-l` | Language code (e.g., en, de, fr) | `en` |
| `--marginX` | | Horizontal margin in pixels | `0` |
| `--marginY` | | Vertical margin in pixels | `0` |
| `--maxWidth` | | Maximum content width in pixels | `800` |
| `--restrictWidth` | | Restrict width and center content | `false` |
| `--hideEmbed` | | Hide embed button in exports | `false` |
| `--hideRights` | | Hide copyright information | `false` |
| `--help` | `-h` | Show help message | |

## Examples

### Export to SCORM only

```bash
npm run batch-export -- --input ./h5p-files --output ./exports --format scorm
```

### Export to HTML with external media files only

```bash
npm run batch-export -- --input ./h5p-files --output ./exports --format external
```

### Export to both formats (default)

```bash
npm run batch-export -- --input ./h5p-files --output ./exports
```

### Export with custom mastery score

```bash
npm run batch-export -- --input ./h5p-files --output ./exports --masteryScore 80
```

### Export with custom CSS

```bash
npm run batch-export -- --input ./h5p-files --output ./exports --css ./custom-styles.css
```

### Export with custom margins and width

```bash
npm run batch-export -- \
  --input ./h5p-files \
  --output ./exports \
  --format scorm \
  --marginX 20 \
  --marginY 20 \
  --maxWidth 1200 \
  --restrictWidth
```

**Note**: `--restrictWidth`, `--hideEmbed`, and `--hideRights` are boolean flags and don't require a value.

### Complete example with all options

```bash
npm run batch-export -- \
  --input ./h5p-files \
  --output ./exports \
  --format both \
  --masteryScore 85 \
  --css ./my-styles.css \
  --language de \
  --marginX 10 \
  --marginY 10 \
  --maxWidth 1000 \
  --restrictWidth \
  --hideEmbed
```

## Output Structure

The CLI creates an organized subdirectory structure for each H5P file in the output directory:

```
output-directory/
├── content-1/
│   ├── SCORM/
│   │   └── content-1.zip         (SCORM package)
│   └── HTML/
│       ├── index.html            (HTML file)
│       └── index/                (External media files)
│           ├── images/
│           ├── videos/
│           └── ...
├── content-2/
│   ├── SCORM/
│   │   └── content-2.zip
│   └── HTML/
│       ├── index.html
│       └── index/
└── content-3/
    ├── SCORM/
    │   └── content-3.zip
    └── HTML/
        ├── index.html
        └── index/
```

**Structure Details:**
- Each H5P file gets its own directory named after the original H5P filename
- **SCORM/** subdirectory contains the SCORM package as a single ZIP file
- **HTML/** subdirectory contains the HTML export with:
  - `index.html` - The main HTML file
  - `index/` - Directory containing all external media files and assets

## Export Formats

### SCORM Format (`--format scorm`)

Creates a SCORM 1.2 compliant package as a ZIP file containing:
- HTML5 player
- SCORM API wrapper
- All H5P content and libraries
- imsmanifest.xml metadata

**Use case**: Upload to Learning Management Systems (LMS) like Moodle, Canvas, Blackboard, etc.

### HTML External Format (`--format external`)

Creates an HTML file with separate media files:
- Main HTML file with H5P player
- Subdirectory with images, videos, audio, and other assets
- Relative paths for easy deployment

**Use case**: Host on web servers or CDNs with separate media file management

### Both Formats (`--format both`)

Exports to both SCORM and HTML external formats simultaneously.

## Data Storage

The CLI tool stores temporary data in:

**macOS/Linux**: `~/.lumi-cli/`
**Windows**: `%USERPROFILE%\.lumi-cli\`

This includes:
- Temporary content storage during processing
- H5P library cache
- Temporary files (automatically cleaned up)

This is separate from the main Lumi Desktop Editor data directory to avoid conflicts.

## Processing Details

### Sequential Processing

The CLI processes files one at a time in sequential order. For 10-20 files, this typically takes:
- Simple content: 5-10 seconds per file
- Complex content with media: 10-30 seconds per file

### Error Handling

If a file fails to process:
1. The error is logged to the console
2. The file is skipped
3. Processing continues with the next file
4. The final summary shows total files processed

### Progress Output

The CLI provides real-time progress updates:

```
============================================================
Lumi H5P Batch Export CLI
============================================================

Configuration:
  Input:        /path/to/h5p-files
  Output:       /path/to/exports
  Format:       both
  Mastery:      75%
  Language:     en

Initializing H5P infrastructure...
H5P infrastructure initialized successfully

Scanning for H5P files...
Found 3 H5P file(s)

[1/3] Processing: interactive-video
  Importing: interactive-video.h5p
  Content ID: 123456
  Exporting to SCORM...
  Exported to: /path/to/exports/interactive-video/interactive-video-scorm.zip
  Exporting to HTML external...
  Exported to: /path/to/exports/interactive-video/interactive-video.html
  ✓ Completed successfully

[2/3] Processing: quiz-game
  ...

Cleaning up temporary files...

============================================================
Batch export completed!
============================================================
Total files processed: 3
Output directory: /path/to/exports
```

## Troubleshooting

### "No H5P files found in input directory"

- Ensure the input directory exists
- Check that files have the `.h5p` extension
- The CLI does not scan subdirectories (place all H5P files in the root of the input directory)

### "Input directory does not exist"

- Verify the path is correct
- Use absolute paths or paths relative to the project root
- Ensure you have read permissions for the directory

### Individual file fails to process

- Check the error message in the console output
- Verify the H5P file is not corrupted
- Ensure the H5P file uses supported content types
- Try opening the file in Lumi Desktop Editor first to verify it's valid

### Build errors

If you encounter TypeScript compilation errors:

```bash
# Clean build directory and rebuild
rm -rf build/
npm run build
```

### Memory issues with large files

If processing very large H5P files (>500MB), you may need to increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run batch-export -- --input ./h5p-files --output ./exports
```

## Technical Details

### Architecture

The CLI tool:
1. Initializes H5P infrastructure without Electron
2. Uses the same export functions as the GUI application
3. Creates temporary user data in `~/.lumi-cli/`
4. Imports each H5P file into temporary storage
5. Exports using the core `exportH5P()` function
6. Cleans up temporary content after each export

### Dependencies

The CLI uses existing Lumi dependencies:
- `@lumieducation/h5p-server` - H5P backend engine
- `@lumieducation/h5p-html-exporter` - HTML export functionality
- `simple-scorm-packager` - SCORM package creation
- `i18next` - Internationalization
- `fs-extra` - File system operations

No additional packages are required.

### Source Code

The CLI implementation is located at:
- **Main script**: `src/cli/batch-export.ts`
- **Export logic**: `src/ops/export-h5p.ts` (shared with GUI)
- **Import logic**: `src/ops/content_import.ts` (shared with GUI)

## Limitations

- Only processes H5P files in the root of the input directory (no recursive scanning)
- Sequential processing only (no parallel exports)
- Requires building TypeScript before running
- Uses same H5P configuration as the desktop application

## Future Enhancements

Potential improvements for future versions:
- Recursive directory scanning
- Parallel processing with configurable concurrency
- Watch mode for continuous processing
- Custom templates support
- Export to additional formats (xAPI, SCORM 2004)
- Progress bar with estimated time remaining
- JSON configuration file support
- Dry-run mode

## Contributing

When modifying the CLI tool:

1. Edit `src/cli/batch-export.ts`
2. Rebuild: `npm run build`
3. Test with sample H5P files
4. Ensure error handling works correctly
5. Update this documentation

## License

Same as Lumi Desktop Editor - AGPL-3.0

## Support

For issues or questions:
- Open an issue on the Lumi GitHub repository
- Consult the main Lumi documentation
- Check the H5P documentation at h5p.org

## Version

Initial release: Compatible with Lumi v1.0.0
