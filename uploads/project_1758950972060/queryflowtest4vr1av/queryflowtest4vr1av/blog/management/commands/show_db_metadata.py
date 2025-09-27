from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth.models import User
from blog.models import Post, Comment, Category, Tag, UserProfile, PostLike, PostTag


class Command(BaseCommand):
    help = 'Display SQLite database metadata using PRAGMA commands'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            self.stdout.write(self.style.SUCCESS('=== SQLite Database Metadata ===\n'))
            
            # Show database schema
            self.stdout.write(self.style.WARNING('1. Database Schema:'))
            cursor.execute("PRAGMA table_list;")
            tables = cursor.fetchall()
            for table in tables:
                self.stdout.write(f"  - {table[1]} (type: {table[2]})")
            
            self.stdout.write('\n')
            
            # Show table info for each table
            for table in tables:
                table_name = table[1]
                if table_name.startswith('django_') or table_name == 'sqlite_sequence':
                    continue
                    
                self.stdout.write(self.style.WARNING(f'2. Table: {table_name}'))
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                
                self.stdout.write('   Columns:')
                for col in columns:
                    col_name, col_type, not_null, default_val, pk = col[1], col[2], col[3], col[4], col[5]
                    pk_str = ' (PRIMARY KEY)' if pk else ''
                    not_null_str = ' NOT NULL' if not_null else ''
                    default_str = f' DEFAULT {default_val}' if default_val else ''
                    self.stdout.write(f'     - {col_name}: {col_type}{not_null_str}{default_str}{pk_str}')
                
                # Show indexes
                cursor.execute(f"PRAGMA index_list({table_name});")
                indexes = cursor.fetchall()
                if indexes:
                    self.stdout.write('   Indexes:')
                    for idx in indexes:
                        idx_name, unique = idx[1], idx[2]
                        unique_str = ' (UNIQUE)' if unique else ''
                        self.stdout.write(f'     - {idx_name}{unique_str}')
                
                # Show foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({table_name});")
                fks = cursor.fetchall()
                if fks:
                    self.stdout.write('   Foreign Keys:')
                    for fk in fks:
                        col_name, ref_table, ref_col = fk[3], fk[2], fk[4]
                        self.stdout.write(f'     - {col_name} -> {ref_table}.{ref_col}')
                
                self.stdout.write('\n')
            
            # Show views
            self.stdout.write(self.style.WARNING('3. Database Views:'))
            cursor.execute("SELECT name FROM sqlite_master WHERE type='view';")
            views = cursor.fetchall()
            for view in views:
                self.stdout.write(f"  - {view[0]}")
            
            self.stdout.write('\n')
            
            # Show triggers
            self.stdout.write(self.style.WARNING('4. Database Triggers:'))
            cursor.execute("SELECT name FROM sqlite_master WHERE type='trigger';")
            triggers = cursor.fetchall()
            for trigger in triggers:
                self.stdout.write(f"  - {trigger[0]}")
            
            self.stdout.write('\n')
            
            # Show database statistics
            self.stdout.write(self.style.WARNING('5. Database Statistics:'))
            cursor.execute("PRAGMA database_list;")
            db_info = cursor.fetchall()
            for db in db_info:
                self.stdout.write(f"  - Database: {db[1]} (file: {db[2]})")
            
            # Show record counts
            self.stdout.write('\n6. Record Counts:')
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
            
            for name, model in models:
                count = model.objects.count()
                self.stdout.write(f"  - {name}: {count}")
            
            # Show sample data from views
            self.stdout.write('\n7. Sample Data from Views:')
            try:
                cursor.execute("SELECT * FROM post_statistics LIMIT 5;")
                view_data = cursor.fetchall()
                if view_data:
                    self.stdout.write('   Post Statistics View (first 5 rows):')
                    for row in view_data:
                        self.stdout.write(f"     - Post ID {row[0]}: {row[1]} (views: {row[5]}, likes: {row[6]}, comments: {row[7]})")
                else:
                    self.stdout.write('   No data in post_statistics view')
            except Exception as e:
                self.stdout.write(f"   Error querying view: {e}")
            
            self.stdout.write('\n' + self.style.SUCCESS('=== End of Database Metadata ==='))
