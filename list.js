#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Alfred workflow data
const alfredWorkflowData = process.env.alfred_workflow_data || '';
const configPath = path.join(alfredWorkflowData, 'config.json');
const localStickiesPath = path.join(alfredWorkflowData, 'local_stickies.json');

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
    if (config.userId && config.supabaseUrl && config.supabaseKey) {
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
        subtitle: 'Sign in to sync your notes across devices',
        arg: 'login',
        icon: {
          path: 'icon.png'
        }
      });
    } else {
      items.unshift({
        uid: 'plotta-logout',
        title: 'Logout from Plotta',
        subtitle: 'Sign out and use anonymous mode',
        arg: 'logout',
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