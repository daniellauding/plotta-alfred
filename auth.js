#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Get Alfred workflow data
const alfredWorkflowData = process.env.alfred_workflow_data || '';
const dataDir = alfredWorkflowData || path.join(require('os').homedir(), '.plotta-alfred');
const configPath = path.join(dataDir, 'config.json');

// Plotta's public configuration
const PLOTTA_CONFIG = {
  supabaseUrl: 'https://jxhtlgdzjqhrgrnhnqfp.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHRsZ2R6anFocmdybmhucWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2Njk3ODIsImV4cCI6MjA0NzI0NTc4Mn0.vOvUOI1Q4zVwUMLYR_Ny8mjjVW6a2ZMPf6EEjKGGCw8'
};

// Load configuration
let config = {
  supabaseUrl: PLOTTA_CONFIG.supabaseUrl,
  supabaseKey: PLOTTA_CONFIG.supabaseKey,
  accessToken: null,
  refreshToken: null,
  userId: null,
  userEmail: null,
  anonymousMode: true
};

if (fs.existsSync(configPath)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...savedConfig };
  } catch (error) {
    console.error('Failed to load config:', error.message);
  }
}

function saveConfig() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error.message);
  }
}

async function extractSessionFromBrowser() {
  return new Promise((resolve) => {
    // Try to get session from Chrome's localStorage
    const script = `
      tell application "Google Chrome"
        if (count of windows) > 0 then
          set currentTab to active tab of front window
          set currentURL to URL of currentTab
          
          if currentURL contains "plotta.app" then
            set jsCode to "
              try {
                const authData = localStorage.getItem('sb-jxhtlgdzjqhrgrnhnqfp-auth-token');
                if (authData) {
                  const parsed = JSON.parse(authData);
                  JSON.stringify({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token,
                    user: parsed.user
                  });
                } else { 
                  'null'; 
                }
              } catch(e) { 
                'null'; 
              }
            "
            
            set result to execute currentTab javascript jsCode
            return result
          else
            return "not_on_plotta"
          end if
        else
          return "no_windows"
        end if
      end tell
    `;
    
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(null);
        return;
      }
      
      const result = stdout.trim();
      if (result === 'null' || result === 'not_on_plotta' || result === 'no_windows') {
        resolve(null);
        return;
      }
      
      try {
        const authData = JSON.parse(result);
        resolve(authData);
      } catch (e) {
        resolve(null);
      }
    });
  });
}

async function handleAuth(action) {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

  switch (action) {
    case 'login':
      console.log('🔐 Plotta Login');
      console.log('');
      console.log('1. Open https://plotta.app in your browser');
      console.log('2. Sign in with your account');
      console.log('3. Once logged in, run: node auth.js extract');
      console.log('');
      console.log('Or open the login page now:');
      exec('open https://plotta.app/auth');
      break;
      
    case 'extract':
      console.log('🔍 Extracting login session...');
      
      const authData = await extractSessionFromBrowser();
      
      if (!authData || !authData.access_token) {
        console.log('❌ Could not find login session.');
        console.log('');
        console.log('Please make sure:');
        console.log('1. You are logged into https://plotta.app in Chrome');
        console.log('2. The Plotta tab is currently active');
        console.log('3. You have given Chrome accessibility permissions');
        return;
      }
      
      try {
        // Verify the token works
        const { data: { user }, error } = await supabase.auth.getUser(authData.access_token);
        
        if (error || !user) {
          console.log('❌ Invalid session. Please try logging in again.');
          return;
        }
        
        config.accessToken = authData.access_token;
        config.refreshToken = authData.refresh_token;
        config.userId = user.id;
        config.userEmail = user.email;
        config.anonymousMode = false;
        saveConfig();
        
        console.log(`✅ Logged in successfully as ${user.email}`);
        console.log('Your notes will now sync to your Plotta account.');
        
      } catch (error) {
        console.log('❌ Error verifying session:', error.message);
      }
      break;
      
    case 'logout':
      config.accessToken = null;
      config.refreshToken = null;
      config.userId = null;
      config.userEmail = null;
      config.anonymousMode = true;
      saveConfig();
      console.log('✅ Logged out successfully. Notes will now be saved locally.');
      break;
      
    case 'status':
      if (config.userId) {
        console.log(`✅ Logged in as: ${config.userEmail || config.userId}`);
        console.log('Notes will sync to your Plotta account.');
      } else {
        console.log('❌ Not logged in - using anonymous mode.');
        console.log('Notes are saved locally only.');
        console.log('');
        console.log('To login: node auth.js login');
      }
      break;
      
    default:
      console.log('Usage: node auth.js [login|extract|logout|status]');
      console.log('');
      console.log('Commands:');
      console.log('  login   - Open login page and show instructions');
      console.log('  extract - Extract login session from browser');
      console.log('  logout  - Sign out and switch to anonymous mode');
      console.log('  status  - Check current login status');
  }
}

const action = process.argv[2];
if (action) {
  handleAuth(action);
} else {
  console.log('Usage: node auth.js [login|extract|logout|status]');
  console.log('');
  console.log('Commands:');
  console.log('  login   - Open login page and show instructions');
  console.log('  extract - Extract login session from browser');
  console.log('  logout  - Sign out and switch to anonymous mode');
  console.log('  status  - Check current login status');
}