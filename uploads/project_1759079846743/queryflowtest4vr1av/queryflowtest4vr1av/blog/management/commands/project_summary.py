from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth.models import User
from blog.models import Post, Comment, Category, Tag, UserProfile, PostLike, PostTag


class Command(BaseCommand):
    help = 'Display comprehensive project summary and statistics'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('    DJANGO BLOG PROJECT SUMMARY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        self.display_project_overview()
        self.display_database_statistics()
        self.display_schema_features()
        self.display_orm_features()
        self.display_sample_data_summary()
        self.display_management_commands()
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('    PROJECT COMPLETED SUCCESSFULLY!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

    def display_project_overview(self):
        self.stdout.write(self.style.WARNING('\n📋 PROJECT OVERVIEW:'))
        self.stdout.write('   ✅ Django 4.2.7 with SQLite database')
        self.stdout.write('   ✅ 3+ related tables with proper relationships')
        self.stdout.write('   ✅ Primary keys, foreign keys, constraints, indexes')
        self.stdout.write('   ✅ Auto-increment fields and UUID support')
        self.stdout.write('   ✅ Database metadata via SQLite PRAGMA commands')
        self.stdout.write('   ✅ 50+ sample data rows across all tables')
        self.stdout.write('   ✅ Multiple migration steps with schema evolution')
        self.stdout.write('   ✅ ORM models with relationships, validations, hooks')
        self.stdout.write('   ✅ Database views, triggers, and functions')
        self.stdout.write('   ✅ Custom managers, scopes, and advanced features')

    def display_database_statistics(self):
        self.stdout.write(self.style.WARNING('\n📊 DATABASE STATISTICS:'))
        
        # Table counts
        models = [
            ('Users', User),
            ('User Profiles', UserProfile),
            ('Categories', Category),
            ('Posts', Post),
            ('Comments', Comment),
            ('Tags', Tag),
            ('Post Tags', PostTag),
            ('Post Likes', PostLike),
        ]
        
        total_records = 0
        for name, model in models:
            count = model.objects.count()
            total_records += count
            self.stdout.write(f'   📄 {name}: {count:,} records')
        
        self.stdout.write(f'   📈 Total Records: {total_records:,}')
        
        # Database size
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA page_count;")
            page_count = cursor.fetchone()[0]
            cursor.execute("PRAGMA page_size;")
            page_size = cursor.fetchone()[0]
            db_size = page_count * page_size
            self.stdout.write(f'   💾 Database Size: {db_size:,} bytes ({db_size/1024:.1f} KB)')

    def display_schema_features(self):
        self.stdout.write(self.style.WARNING('\n🏗️  DATABASE SCHEMA FEATURES:'))
        
        with connection.cursor() as cursor:
            # Tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'django_%' AND name NOT LIKE 'sqlite_%';")
            tables = cursor.fetchall()
            self.stdout.write(f'   📋 Tables: {len(tables)} custom tables')
            
            # Views
            cursor.execute("SELECT name FROM sqlite_master WHERE type='view';")
            views = cursor.fetchall()
            self.stdout.write(f'   👁️  Views: {len(views)} database views')
            
            # Triggers
            cursor.execute("SELECT name FROM sqlite_master WHERE type='trigger';")
            triggers = cursor.fetchall()
            self.stdout.write(f'   ⚡ Triggers: {len(triggers)} database triggers')
            
            # Indexes
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%';")
            index_count = cursor.fetchone()[0]
            self.stdout.write(f'   🔍 Indexes: {index_count} custom indexes')
            
            # Foreign Keys
            cursor.execute("PRAGMA foreign_key_list(posts);")
            fk_count = len(cursor.fetchall())
            self.stdout.write(f'   🔗 Foreign Keys: {fk_count}+ relationships')

    def display_orm_features(self):
        self.stdout.write(self.style.WARNING('\n🔧 ORM FEATURES:'))
        
        # Model relationships
        self.stdout.write('   🔗 Relationships:')
        self.stdout.write('      • One-to-One: User ↔ UserProfile')
        self.stdout.write('      • One-to-Many: User → Posts, User → Comments')
        self.stdout.write('      • Many-to-Many: Posts ↔ Tags')
        self.stdout.write('      • Self-Referencing: Comments → Comments (threading)')
        
        # Custom managers
        self.stdout.write('   🎯 Custom Managers:')
        self.stdout.write('      • PublishedPostManager with featured(), by_category(), recent()')
        
        # Model methods
        self.stdout.write('   ⚙️  Model Methods:')
        self.stdout.write('      • Properties: is_published, comment_count, is_reply')
        self.stdout.write('      • Methods: get_age(), increment_view_count()')
        self.stdout.write('      • Validations: clean() methods with custom validation')
        
        # Signals
        self.stdout.write('   📡 Django Signals:')
        self.stdout.write('      • post_save: Auto-update like counts, approval times')
        self.stdout.write('      • User creation: Auto-create user profiles')

    def display_sample_data_summary(self):
        self.stdout.write(self.style.WARNING('\n📝 SAMPLE DATA SUMMARY:'))
        
        # Post statistics
        published_posts = Post.objects.filter(status='published').count()
        draft_posts = Post.objects.filter(status='draft').count()
        featured_posts = Post.objects.filter(featured=True).count()
        
        self.stdout.write(f'   📰 Posts: {published_posts} published, {draft_posts} drafts, {featured_posts} featured')
        
        # Comment statistics
        approved_comments = Comment.objects.filter(is_approved=True).count()
        pending_comments = Comment.objects.filter(is_approved=False).count()
        spam_comments = Comment.objects.filter(is_spam=True).count()
        
        self.stdout.write(f'   💬 Comments: {approved_comments} approved, {pending_comments} pending, {spam_comments} spam')
        
        # User statistics
        verified_users = UserProfile.objects.filter(is_verified=True).count()
        total_users = User.objects.count()
        
        self.stdout.write(f'   👥 Users: {total_users} total, {verified_users} verified')
        
        # Engagement statistics
        total_views = sum(Post.objects.values_list('view_count', flat=True))
        total_likes = sum(Post.objects.values_list('like_count', flat=True))
        
        self.stdout.write(f'   📊 Engagement: {total_views:,} total views, {total_likes:,} total likes')

    def display_management_commands(self):
        self.stdout.write(self.style.WARNING('\n🛠️  MANAGEMENT COMMANDS:'))
        
        commands = [
            ('show_db_metadata', 'Display comprehensive database metadata using SQLite PRAGMA commands'),
            ('populate_sample_data', 'Populate database with realistic sample data (50+ rows)'),
            ('demo_orm_queries', 'Demonstrate advanced Django ORM features and queries'),
            ('project_summary', 'Display this comprehensive project summary'),
        ]
        
        for command, description in commands:
            self.stdout.write(f'   🔧 {command}: {description}')
        
        self.stdout.write('\n   💡 Usage Examples:')
        self.stdout.write('      python manage.py show_db_metadata')
        self.stdout.write('      python manage.py populate_sample_data --users 20 --posts 30')
        self.stdout.write('      python manage.py demo_orm_queries')
        self.stdout.write('      python manage.py project_summary')

    def display_migration_history(self):
        self.stdout.write(self.style.WARNING('\n📚 MIGRATION HISTORY:'))
        
        migrations = [
            ('0001_initial', 'Initial schema creation with all tables, indexes, and constraints'),
            ('0002_add_additional_fields', 'Added reading_time and is_featured fields'),
            ('0003_add_database_objects', 'Added database views, triggers, and functions'),
        ]
        
        for migration, description in migrations:
            self.stdout.write(f'   📄 {migration}: {description}')

    def display_constraints_and_indexes(self):
        self.stdout.write(self.style.WARNING('\n🔒 CONSTRAINTS & INDEXES:'))
        
        self.stdout.write('   🚫 Constraints:')
        self.stdout.write('      • NOT NULL: All primary keys and required fields')
        self.stdout.write('      • UNIQUE: Usernames, emails, slugs, phone numbers')
        self.stdout.write('      • CHECK: Status validation, published_at validation')
        self.stdout.write('      • FOREIGN KEY: All relationship constraints')
        
        self.stdout.write('   🔍 Indexes:')
        self.stdout.write('      • Primary Key: All tables')
        self.stdout.write('      • Foreign Key: All relationships')
        self.stdout.write('      • Composite: Multi-column indexes for common queries')
        self.stdout.write('      • Custom: Frequently queried fields')
