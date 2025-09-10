# Analytics Dashboard

A comprehensive data analytics dashboard built with Django and PostgreSQL.

## Features

- Interactive dashboards
- Multiple chart types (bar, line, pie, scatter, area)
- Data source management
- Real-time data updates
- User authentication
- Scheduled reports
- REST API
- Admin interface

## Tech Stack

- **Backend**: Django 4.2, Python 3.11
- **Database**: PostgreSQL
- **API**: Django REST Framework
- **Frontend**: Django Templates (can be extended with React/Vue)
- **Authentication**: Django Auth
- **Task Scheduling**: Django Q (optional)

## Database Schema

### Dashboard
- id (Primary Key)
- title
- description
- owner (Foreign Key to User)
- is_public
- created_at
- updated_at

### Chart
- id (Primary Key)
- title
- chart_type (bar, line, pie, scatter, area)
- dashboard (Foreign Key)
- data_source (JSON)
- config (JSON)
- position_x, position_y
- width, height
- created_at
- updated_at

### DataSource
- id (Primary Key)
- name
- source_type (database, api, file)
- connection_config (JSON)
- query (SQL or API config)
- refresh_interval
- last_refresh
- is_active
- created_at
- updated_at

### Report
- id (Primary Key)
- title
- dashboard (Foreign Key)
- schedule (cron expression)
- recipients (JSON)
- format (pdf, html, csv, json)
- is_active
- last_run
- next_run
- created_at
- updated_at

## Getting Started

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure database in `analytics_dashboard/settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'analytics_db',
        'USER': 'analytics_user',
        'PASSWORD': 'analytics_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create superuser:
```bash
python manage.py createsuperuser
```

5. Start the development server:
```bash
python manage.py runserver
```

The application will be available at `http://localhost:8000`

## API Endpoints

### Dashboards
- `GET /api/dashboards/` - List dashboards
- `POST /api/dashboards/` - Create dashboard
- `GET /api/dashboards/{id}/` - Get dashboard details
- `PUT /api/dashboards/{id}/` - Update dashboard
- `DELETE /api/dashboards/{id}/` - Delete dashboard

### Charts
- `GET /api/charts/` - List charts
- `POST /api/charts/` - Create chart
- `GET /api/charts/{id}/` - Get chart details
- `PUT /api/charts/{id}/` - Update chart

### Data Sources
- `GET /api/data-sources/` - List data sources
- `POST /api/data-sources/` - Create data source
- `PUT /api/data-sources/{id}/` - Update data source
- `DELETE /api/data-sources/{id}/` - Delete data source

## Configuration

### Database Configuration
Update `analytics_dashboard/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_database_name',
        'USER': 'your_username',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Environment Variables
Create a `.env` file:

```bash
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost:5432/analytics_db
```

## Chart Types

The application supports multiple chart types:

1. **Bar Chart**: Compare values across categories
2. **Line Chart**: Show trends over time
3. **Pie Chart**: Display proportions
4. **Scatter Plot**: Show relationships between variables
5. **Area Chart**: Display cumulative data

## Data Sources

Supported data source types:

- **Database**: Direct SQL queries
- **API**: REST API endpoints
- **File**: CSV, JSON, XML files
- **Custom**: Custom data providers

## Scheduled Reports

Reports can be scheduled using cron expressions:

- Daily: `0 9 * * *` (9 AM daily)
- Weekly: `0 9 * * 1` (9 AM every Monday)
- Monthly: `0 9 1 * *` (9 AM first day of month)

Reports are generated in PDF, HTML, CSV, or JSON format.
