from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Add Report model"""

    dependencies = [
        ('analytics', '0002_chart_datasource'),
    ]

    operations = [
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('schedule', models.CharField(max_length=100)),
                ('recipients', models.JSONField()),
                ('format', models.CharField(choices=[('pdf', 'PDF'), ('html', 'HTML'), ('csv', 'CSV'), ('json', 'JSON')], default='pdf', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('last_run', models.DateTimeField(blank=True, null=True)),
                ('next_run', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('dashboard', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='analytics.dashboard')),
            ],
        ),
    ]
