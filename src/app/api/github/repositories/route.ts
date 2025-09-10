// GitHub Repositories API Route
// Fetch user's GitHub repositories

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '30');
    const sort = searchParams.get('sort') || 'updated';
    const type = searchParams.get('type') || 'all';

    // In a real implementation, this would:
    // 1. Get the user's GitHub access token from session/storage
    // 2. Make authenticated requests to GitHub API
    // 3. Return actual repository data

    // For now, return mock data
    const mockRepositories = [
      {
        id: 123456789,
        node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODk=',
        name: 'ecommerce-platform',
        full_name: 'johndoe/ecommerce-platform',
        private: false,
        owner: {
          login: 'johndoe',
          id: 987654321,
          avatar_url: 'https://github.com/images/error/johndoe_happy.gif',
          type: 'User'
        },
        html_url: 'https://github.com/johndoe/ecommerce-platform',
        description: 'A full-stack e-commerce platform built with Node.js and React',
        fork: false,
        url: 'https://api.github.com/repos/johndoe/ecommerce-platform',
        archive_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/zipball/main',
        assignees_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/assignees{/user}',
        blobs_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/git/blobs{/sha}',
        branches_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/branches{/branch}',
        collaborators_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/collaborators{/collaborator}',
        comments_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/comments{/number}',
        commits_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/commits{/sha}',
        compare_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/compare/{base}...{head}',
        contents_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/contents/{+path}',
        contributors_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/contributors',
        deployments_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/deployments',
        downloads_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/downloads',
        events_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/events',
        forks_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/forks',
        git_commits_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/git/commits{/sha}',
        git_refs_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/git/refs{/sha}',
        git_tags_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/git/tags{/sha}',
        git_url: 'git://github.com/johndoe/ecommerce-platform.git',
        issue_comment_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/issues/comments{/number}',
        issue_events_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/issues/events{/number}',
        issues_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/issues{/number}',
        keys_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/keys{/key_id}',
        labels_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/labels{/name}',
        languages_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/languages',
        merges_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/merges',
        milestones_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/milestones{/number}',
        notifications_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/notifications{?since,all,participating}',
        pulls_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/pulls{/number}',
        releases_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/releases{/id}',
        ssh_url: 'git@github.com:johndoe/ecommerce-platform.git',
        stargazers_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/stargazers',
        statuses_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/statuses/{sha}',
        subscribers_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/subscribers',
        subscription_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/subscription',
        tags_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/tags',
        teams_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/teams',
        trees_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/git/trees{/sha}',
        clone_url: 'https://github.com/johndoe/ecommerce-platform.git',
        mirror_url: null,
        hooks_url: 'https://api.github.com/repos/johndoe/ecommerce-platform/hooks',
        svn_url: 'https://svn.github.com/johndoe/ecommerce-platform',
        homepage: 'https://ecommerce-platform.demo.com',
        language: 'JavaScript',
        forks_count: 12,
        stargazers_count: 45,
        watchers_count: 45,
        size: 2048,
        default_branch: 'main',
        open_issues_count: 3,
        is_template: false,
        topics: ['ecommerce', 'nodejs', 'react', 'mongodb'],
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        has_pages: false,
        has_downloads: true,
        has_discussions: false,
        archived: false,
        disabled: false,
        visibility: 'public',
        pushed_at: '2024-01-20T10:30:00Z',
        created_at: '2023-06-15T14:20:00Z',
        updated_at: '2024-01-20T10:30:00Z',
        permissions: {
          admin: true,
          maintain: true,
          push: true,
          triage: true,
          pull: true
        }
      },
      {
        id: 987654321,
        node_id: 'MDEwOlJlcG9zaXRvcnk5ODc2NTQzMjE=',
        name: 'data-analytics-dashboard',
        full_name: 'johndoe/data-analytics-dashboard',
        private: true,
        owner: {
          login: 'johndoe',
          id: 987654321,
          avatar_url: 'https://github.com/images/error/johndoe_happy.gif',
          type: 'User'
        },
        html_url: 'https://github.com/johndoe/data-analytics-dashboard',
        description: 'Advanced data analytics dashboard with Python and PostgreSQL',
        fork: false,
        language: 'Python',
        forks_count: 5,
        stargazers_count: 23,
        watchers_count: 23,
        size: 1536,
        default_branch: 'main',
        open_issues_count: 1,
        topics: ['analytics', 'python', 'postgresql', 'django'],
        has_issues: true,
        has_projects: false,
        has_wiki: false,
        has_pages: false,
        has_downloads: true,
        archived: false,
        disabled: false,
        visibility: 'private',
        pushed_at: '2024-01-19T16:45:00Z',
        created_at: '2023-08-10T09:15:00Z',
        updated_at: '2024-01-19T16:45:00Z'
      }
    ];

    return NextResponse.json(mockRepositories);
  } catch (error) {
    console.error('GitHub repositories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
