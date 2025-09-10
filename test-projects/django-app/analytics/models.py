from django.db import models
from django.contrib.auth.models import User


class Dashboard(models.Model):
    """Dashboard model for analytics"""
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Chart(models.Model):
    """Chart model for dashboard visualizations"""
    CHART_TYPES = [
        ('bar', 'Bar Chart'),
        ('line', 'Line Chart'),
        ('pie', 'Pie Chart'),
        ('scatter', 'Scatter Plot'),
        ('area', 'Area Chart'),
    ]

    title = models.CharField(max_length=200)
    chart_type = models.CharField(max_length=20, choices=CHART_TYPES)
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='charts')
    data_source = models.JSONField()  # Configuration for data source
    config = models.JSONField()  # Chart configuration
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=400)
    height = models.IntegerField(default=300)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.dashboard.title})"


class DataSource(models.Model):
    """Data source model for external data connections"""
    name = models.CharField(max_length=200)
    source_type = models.CharField(max_length=50)  # 'database', 'api', 'file', etc.
    connection_config = models.JSONField()  # Database credentials, API endpoints, etc.
    query = models.TextField()  # SQL query or API configuration
    refresh_interval = models.IntegerField(default=3600)  # seconds
    last_refresh = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Report(models.Model):
    """Report model for scheduled analytics reports"""
    title = models.CharField(max_length=200)
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE)
    schedule = models.CharField(max_length=100)  # cron expression
    recipients = models.JSONField()  # email addresses
    format = models.CharField(max_length=20, choices=[
        ('pdf', 'PDF'),
        ('html', 'HTML'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ], default='pdf')
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
