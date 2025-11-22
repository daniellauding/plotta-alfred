#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function createSticky(data) {
  try {
    const { content, project, createProject } = JSON.parse(data);
    
    // Configuration is now hardcoded, no need to check

    const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false
      }
    });

    // If we have an access token, use it
    if (config.accessToken) {
      await supabase.auth.setSession({
        access_token: config.accessToken,
        refresh_token: config.refreshToken
      });
    }

    let projectId = 'draft';
    
    // Handle project creation or selection
    if (project && createProject) {
      // Create new project
      if (config.userId) {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert([
            {
              name: project,
              owner_id: config.userId,
              visibility: 'private'
            }
          ])
          .select()
          .single();
          
        if (projectError) {
          console.log(`Error creating project: ${projectError.message}`);
          // Fall back to draft
          projectId = 'draft';
        } else {
          projectId = newProject.id;
        }
      } else {
        // Anonymous mode - use local project naming
        projectId = `project-${Date.now()}`;
      }
    } else if (project) {
      // Look for existing project
      if (config.userId) {
        const { data: projects, error: searchError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('owner_id', config.userId)
          .ilike('name', `%${project}%`)
          .limit(1);
          
        if (!searchError && projects && projects.length > 0) {
          projectId = projects[0].id;
        } else {
          // Project not found, use draft
          projectId = 'draft';
        }
      } else {
        // Anonymous mode
        projectId = `project-${project}`;
      }
    }

    // Create the sticky note
    const sticky = {
      title: content.length > 50 ? content.substring(0, 50) + '...' : content,
      content: content,
      color: 'yellow',
      x: Math.floor(Math.random() * 200) + 100,
      y: Math.floor(Math.random() * 200) + 100,
      width: 300,
      height: 250,
      zIndex: Date.now(),
      isLocked: false,
      isHidden: false,
      isPinned: false,
      tags: [],
      projectId: projectId
    };

    if (config.userId && projectId !== 'draft' && !projectId.startsWith('project-')) {
      // Authenticated mode - save to database
      const { data: newSticky, error: stickyError } = await supabase
        .from('stickies')
        .insert([{
          ...sticky,
          user_id: config.userId
        }])
        .select()
        .single();
        
      if (stickyError) {
        console.log(`Error creating sticky: ${stickyError.message}`);
        // Fall back to local storage
        saveToLocalStorage(sticky);
      } else {
        console.log(`Created sticky note "${sticky.title}" in project ${project || 'Drafts'}`);
      }
    } else {
      // Anonymous mode or draft - save to local storage
      saveToLocalStorage(sticky);
      console.log(`Created sticky note "${sticky.title}" ${project ? `in project ${project}` : 'in Drafts'} (local)`);
    }

  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

function saveToLocalStorage(sticky) {
  const STORAGE_KEY = "dumpa_stickies";
  
  // Use a fallback directory if Alfred workflow data is not available
  const dataDir = alfredWorkflowData || path.join(require('os').homedir(), '.plotta-alfred');
  const dataPath = path.join(dataDir, 'local_stickies.json');
  
  let stickies = [];
  if (fs.existsSync(dataPath)) {
    try {
      stickies = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
      console.error('Failed to read local stickies:', error.message);
    }
  }
  
  const stickyWithId = {
    ...sticky,
    id: `local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  stickies.push(stickyWithId);
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(stickies, null, 2));
  } catch (error) {
    console.error('Failed to save local stickies:', error.message);
  }
}

// Main execution
const data = process.argv[2];
if (data) {
  createSticky(data);
} else {
  console.log('No data provided');
}