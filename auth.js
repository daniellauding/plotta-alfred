#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Alfred workflow data
const alfredWorkflowData = process.env.alfred_workflow_data || '';
const configPath = path.join(alfredWorkflowData, 'config.json');

// Load configuration
let config = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  accessToken: null,
  userId: null,
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
    if (!fs.existsSync(alfredWorkflowData)) {
      fs.mkdirSync(alfredWorkflowData, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error.message);
  }
}

async function handleAuth(action) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.log('Error: Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Alfred workflow variables.');
    return;
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

  switch (action) {
    case 'login':
      // For CLI login, we'll use magic link method
      console.log('To login to Plotta:');
      console.log('1. Open https://plotta.app in your browser');
      console.log('2. Sign in with your account');
      console.log('3. Go to your browser\'s developer console (F12)');
      console.log('4. Type: localStorage.getItem("supabase.auth.token")');
      console.log('5. Copy the access_token value and run: plotta-auth set-token [token]');
      break;
      
    case 'logout':
      config.accessToken = null;
      config.refreshToken = null;
      config.userId = null;
      config.anonymousMode = true;
      saveConfig();
      console.log('Logged out successfully. Notes will now be saved locally.');
      break;
      
    case 'set-token':
      const token = process.argv[3];
      if (!token) {
        console.log('Please provide a token: plotta-auth set-token [your-token]');
        return;
      }
      
      try {
        // Set the session with the provided token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          console.log('Invalid token. Please try again.');
          return;
        }
        
        config.accessToken = token;
        config.userId = user.id;
        config.anonymousMode = false;
        saveConfig();
        
        console.log(`Logged in successfully as ${user.email || user.id}`);
        console.log('Your notes will now sync to your Plotta account.');
        
      } catch (error) {
        console.log('Error setting token:', error.message);
      }
      break;
      
    case 'status':
      if (config.userId) {
        console.log(`Logged in as user: ${config.userId}`);
        console.log('Notes will sync to your Plotta account.');
      } else {
        console.log('Not logged in - using anonymous mode.');
        console.log('Notes are saved locally only.');
      }
      break;
      
    default:
      console.log('Usage: node auth.js [login|logout|set-token|status]');
  }
}

const action = process.argv[2];
if (action) {
  handleAuth(action);
} else {
  console.log('Usage: node auth.js [login|logout|set-token|status]');
}