#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Alfred workflow data
const alfredWorkflowData = process.env.alfred_workflow_data || '';
const dataDir = alfredWorkflowData || path.join(require('os').homedir(), '.plotta-alfred');
const configPath = path.join(dataDir, 'config.json');
const localStickiesPath = path.join(dataDir, 'local_stickies.json');

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

async function listStickies() {
  const items = [];
  
  try {
    // Load local stickies
    if (fs.existsSync(localStickiesPath)) {
      const localStickies = JSON.parse(fs.readFileSync(localStickiesPath, 'utf8'));
      for (const sticky of localStickies.slice(-10)) { // Last 10
        items.push({
          uid: sticky.id,
          title: sticky.title,
          subtitle: `Local • ${sticky.content.substring(0, 100)}...`,
          arg: `https://plotta.app/project/${sticky.projectId}`,
          icon: {
            path: 'icon.png'
          }
        });
      }
    }
    
    // Load online stickies if authenticated
    if (config.userId) {
      const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: false
        }
      });

      if (config.accessToken) {
        await supabase.auth.setSession({
          access_token: config.accessToken,
          refresh_token: config.refreshToken
        });
      }

      const { data: stickies, error } = await supabase
        .from('stickies')
        .select('*, projects(name)')
        .eq('user_id', config.userId)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!error && stickies) {
        for (const sticky of stickies) {
          const projectName = sticky.projects ? sticky.projects.name : 'Unknown Project';
          items.push({
            uid: sticky.id,
            title: sticky.title,
            subtitle: `${projectName} • ${sticky.content.substring(0, 100)}...`,
            arg: `https://plotta.app/project/${sticky.project_id}`,
            icon: {
              path: 'icon.png'
            }
          });
        }
      }
    }
    
    // Add auth options if not authenticated
    if (!config.userId) {
      items.unshift({
        uid: 'plotta-login',
        title: 'Login to Plotta',
        subtitle: 'Press Enter to open login page, then run: node auth.js extract',
        arg: 'https://plotta.app/auth',
        icon: {
          path: 'icon.png'
        }
      });
    } else {
      items.unshift({
        uid: 'plotta-status',
        title: `Logged in as ${config.userEmail || 'User'}`,
        subtitle: 'Notes are syncing to your Plotta account',
        arg: '',
        valid: false,
        icon: {
          path: 'icon.png'
        }
      });
    }
    
    if (items.length === 0 || (items.length === 1 && items[0].uid.includes('login'))) {
      items.push({
        uid: 'plotta-empty',
        title: 'No notes found',
        subtitle: 'Use "plotta [text]" to create your first note',
        arg: '',
        valid: false,
        icon: {
          path: 'icon.png'
        }
      });
    }

  } catch (error) {
    items.push({
      uid: 'plotta-error',
      title: 'Error loading notes',
      subtitle: error.message,
      arg: '',
      valid: false,
      icon: {
        path: 'icon.png'
      }
    });
  }

  console.log(JSON.stringify({ items }));
}

listStickies();