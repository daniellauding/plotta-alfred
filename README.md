# Plotta Alfred Workflow

A simple Alfred workflow for creating and managing [Plotta](https://plotta.app) sticky notes directly from Alfred.

## Features

- 📝 Create sticky notes with `plotta [text]`
- 📋 List recent notes with `plottalist`
- 🏗️ Create new projects with `plotta project:myproject note content`
- 🔄 Works both authenticated and anonymously
- 🌐 Syncs with your Plotta account when logged in
- 💾 Stores notes locally when anonymous

## Installation

1. Download the `.alfredworkflow` file from the releases
2. Double-click to install in Alfred
3. Set up your Supabase configuration (see Configuration below)

## Configuration

### Supabase Setup

To sync with Plotta, you need to configure the workflow with your Plotta Supabase credentials:

1. In Alfred, open the workflow and click the `[×]` button to configure variables
2. Set these variables:
   - `SUPABASE_URL`: Your Plotta Supabase URL
   - `SUPABASE_ANON_KEY`: Your Plotta anonymous key

For the main Plotta app, these would be the same values used in the web application.

### Authentication (Optional)

The workflow works in anonymous mode by default, storing notes locally. To sync with your Plotta account:

1. Open Terminal and navigate to the workflow directory
2. Run `node auth.js login` for login instructions
3. Follow the instructions to get your auth token
4. Run `node auth.js set-token [your-token]` to authenticate

## Commands

### `plotta [text]`
Creates a new sticky note with the provided text.

Examples:
- `plotta Remember to buy milk` - Creates a note in Drafts
- `plotta project:work Review quarterly reports` - Creates note in "work" project

### `plottalist`
Lists your recent sticky notes. Click any note to open it in Plotta web app.

### Manual Commands (Terminal)

- `node auth.js status` - Check login status
- `node auth.js login` - Get login instructions
- `node auth.js logout` - Log out and switch to anonymous mode

## Usage

### Basic Note Creation
```
plotta This is my note content
```

### Create Note in Specific Project
```
plotta project:personal Remember to call mom
```

### Auto-suggest Project Creation
When you type multiple words, Alfred will suggest creating a new project:
```
plotta shopping Buy groceries
```
This will suggest creating a "shopping" project with the note "Buy groceries".

### List Notes
```
plottalist
```

## How It Works

### Anonymous Mode (Default)
- Notes are stored locally in JSON format
- No account required
- Notes don't sync across devices
- Perfect for quick, temporary notes

### Authenticated Mode
- Notes sync with your Plotta account
- Access from any device
- Full project management
- Collaboration features (when available)

## Files

- `main.js` - Main script filter for note creation
- `create.js` - Creates sticky notes
- `list.js` - Lists existing notes
- `auth.js` - Authentication management
- `info.plist` - Alfred workflow configuration

## Development

To modify this workflow:

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Build the workflow: `npm run build`

## Contributing

Feel free to open issues or submit pull requests to improve the workflow.

## License

MIT License - see LICENSE file for details.