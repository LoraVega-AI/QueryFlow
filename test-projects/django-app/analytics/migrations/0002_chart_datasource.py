from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Add Chart and DataSource models"""

    dependencies = [
        ('analytics', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataSource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('source_type', models.CharField(max_length=50)),
                ('connection_config', models.JSONField()),
                ('query', models.TextField()),
                ('refresh_interval', models.IntegerField(default=3600)),
                ('last_refresh', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='Chart',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('chart_type', models.CharField(choices=[('bar', 'Bar Chart'), ('line', 'Line Chart'), ('pie', 'Pie Chart'), ('scatter', 'Scatter Plot'), ('area', 'Area Chart')], max_length=20)),
                ('data_source', models.JSONField()),
                ('config', models.JSONField()),
                ('position_x', models.IntegerField(default=0)),
                ('position_y', models.IntegerField(default=0)),
                ('width', models.IntegerField(default=400)),
                ('height', models.IntegerField(default=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('dashboard', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='charts', to='analytics.dashboard')),
            ],
        ),
    ]
