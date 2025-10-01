from django.db import migrations


def create_database_objects(apps, schema_editor):
    """
    Create database views, triggers, and functions
    """
    if schema_editor.connection.vendor == 'sqlite':
        # Create a view for post statistics
        schema_editor.execute("""
            CREATE VIEW post_statistics AS
            SELECT 
                p.id,
                p.title,
                p.author_id,
                p.status,
                p.view_count,
                p.like_count,
                COUNT(c.id) as comment_count,
                COUNT(DISTINCT pt.tag_id) as tag_count,
                p.created_at,
                p.published_at
            FROM posts p
            LEFT JOIN comments c ON p.id = c.post_id AND c.is_approved = 1
            LEFT JOIN post_tags pt ON p.id = pt.post_id
            GROUP BY p.id, p.title, p.author_id, p.status, p.view_count, p.like_count, p.created_at, p.published_at
        """)
        
        # Create a function to calculate reading time
        schema_editor.execute("""
            CREATE TRIGGER calculate_reading_time
            AFTER INSERT ON posts
            BEGIN
                UPDATE posts 
                SET reading_time = (LENGTH(content) / 200) + 1
                WHERE id = NEW.id;
            END;
        """)
        
        # Create a trigger to update like count
        schema_editor.execute("""
            CREATE TRIGGER update_post_like_count_insert
            AFTER INSERT ON post_likes
            BEGIN
                UPDATE posts 
                SET like_count = like_count + 1
                WHERE id = NEW.post_id;
            END;
        """)
        
        schema_editor.execute("""
            CREATE TRIGGER update_post_like_count_delete
            AFTER DELETE ON post_likes
            BEGIN
                UPDATE posts 
                SET like_count = like_count - 1
                WHERE id = OLD.post_id;
            END;
        """)
        
        # Create a trigger to update view count
        schema_editor.execute("""
            CREATE TRIGGER increment_view_count
            AFTER UPDATE OF view_count ON posts
            WHEN NEW.view_count = OLD.view_count + 1
            BEGIN
                -- This trigger is for demonstration purposes
                -- In practice, view count would be updated via application logic
                SELECT 1; -- Placeholder
            END;
        """)


def reverse_database_objects(apps, schema_editor):
    """
    Remove database views, triggers, and functions
    """
    if schema_editor.connection.vendor == 'sqlite':
        schema_editor.execute("DROP VIEW IF EXISTS post_statistics;")
        schema_editor.execute("DROP TRIGGER IF EXISTS calculate_reading_time;")
        schema_editor.execute("DROP TRIGGER IF EXISTS update_post_like_count_insert;")
        schema_editor.execute("DROP TRIGGER IF EXISTS update_post_like_count_delete;")
        schema_editor.execute("DROP TRIGGER IF EXISTS increment_view_count;")


class Migration(migrations.Migration):
    dependencies = [
        ('blog', '0002_add_additional_fields'),
    ]

    operations = [
        migrations.RunPython(
            create_database_objects,
            reverse_database_objects,
        ),
    ]
