-- Migration: Create Analytics Tables
-- Framework: Raw SQL Migration
-- Date: 2024-01-19
-- Description: Create comprehensive analytics tables for tracking user behavior and metrics

-- Create page_views table
CREATE TABLE page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER,
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(200),
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    country VARCHAR(50),
    city VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'other')),
    browser VARCHAR(50),
    os VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
    CONSTRAINT chk_device_type CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'other'))
);

-- Create events table
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_value DECIMAL(10,2) DEFAULT 0,
    user_id INTEGER,
    session_id VARCHAR(100),
    properties TEXT, -- JSON string for flexible event properties
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_value CHECK (event_value >= 0)
);

-- Create metrics table
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_type VARCHAR(30) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    dimensions TEXT, -- JSON string for metric dimensions
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_metric_type CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    CONSTRAINT chk_hour CHECK (hour >= 0 AND hour <= 23)
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    page_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    country VARCHAR(50),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    is_bounce BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_device_type CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'other')),
    CONSTRAINT chk_bounce CHECK (is_bounce IN (0, 1))
);

-- Create conversion_funnels table
CREATE TABLE conversion_funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_name VARCHAR(100) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    converted BOOLEAN DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_converted CHECK (converted IN (0, 1))
);

-- Create ab_tests table
CREATE TABLE ab_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name VARCHAR(100) NOT NULL,
    variant_name VARCHAR(50) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    is_control BOOLEAN DEFAULT 0,
    conversion_rate DECIMAL(5,4),
    revenue DECIMAL(10,2) DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_control CHECK (is_control IN (0, 1))
);

-- Create indexes for page_views
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_timestamp ON page_views(timestamp);
CREATE INDEX idx_page_views_page_url ON page_views(page_url);
CREATE INDEX idx_page_views_device_type ON page_views(device_type);
CREATE INDEX idx_page_views_country ON page_views(country);

-- Create indexes for events
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_event_category ON events(event_category);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Create indexes for metrics
CREATE INDEX idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX idx_metrics_metric_type ON metrics(metric_type);
CREATE INDEX idx_metrics_date ON metrics(date);
CREATE INDEX idx_metrics_hour ON metrics(hour);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_start_time ON user_sessions(start_time);
CREATE INDEX idx_user_sessions_device_type ON user_sessions(device_type);

-- Create indexes for conversion_funnels
CREATE INDEX idx_conversion_funnels_funnel_name ON conversion_funnels(funnel_name);
CREATE INDEX idx_conversion_funnels_user_id ON conversion_funnels(user_id);
CREATE INDEX idx_conversion_funnels_session_id ON conversion_funnels(session_id);

-- Create indexes for ab_tests
CREATE INDEX idx_ab_tests_test_name ON ab_tests(test_name);
CREATE INDEX idx_ab_tests_user_id ON ab_tests(user_id);
CREATE INDEX idx_ab_tests_session_id ON ab_tests(session_id);

-- Create composite indexes for complex queries
CREATE INDEX idx_page_views_user_timestamp ON page_views(user_id, timestamp);
CREATE INDEX idx_events_category_timestamp ON events(event_category, timestamp);
CREATE INDEX idx_metrics_name_date ON metrics(metric_name, date);
CREATE INDEX idx_metrics_date_hour ON metrics(date, hour);
CREATE INDEX idx_user_sessions_user_start ON user_sessions(user_id, start_time);
CREATE INDEX idx_conversion_funnels_funnel_step ON conversion_funnels(funnel_name, step_order);
