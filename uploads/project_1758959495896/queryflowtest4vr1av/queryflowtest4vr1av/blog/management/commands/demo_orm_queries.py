from django.core.management.base import BaseCommand
from django.db.models import Q, F, Count, Sum, Avg, Max, Min
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from blog.models import Post, Comment, Category, Tag, UserProfile, PostLike, PostTag


class Command(BaseCommand):
    help = 'Demonstrate ORM queries, relationships, and advanced features'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Django ORM Query Demonstrations ===\n'))
        
        # Basic queries
        self.demonstrate_basic_queries()
        
        # Relationship queries
        self.demonstrate_relationship_queries()
        
        # Aggregation queries
        self.demonstrate_aggregation_queries()
        
        # Custom manager queries
        self.demonstrate_custom_manager_queries()
        
        # Complex queries with Q objects
        self.demonstrate_complex_queries()
        
        # Model methods and properties
        self.demonstrate_model_methods()
        
        self.stdout.write(self.style.SUCCESS('\n=== End of ORM Demonstrations ==='))

    def demonstrate_basic_queries(self):
        self.stdout.write(self.style.WARNING('1. Basic Queries:'))
        
        # Get all published posts
        published_posts = Post.objects.filter(status='published')
        self.stdout.write(f"   Published posts count: {published_posts.count()}")
        
        # Get posts with high view count
        popular_posts = Post.objects.filter(view_count__gte=100)
        self.stdout.write(f"   Popular posts (100+ views): {popular_posts.count()}")
        
        # Get recent posts
        recent_posts = Post.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))
        self.stdout.write(f"   Posts from last 7 days: {recent_posts.count()}")
        
        # Order by multiple fields
        ordered_posts = Post.objects.filter(status='published').order_by('-view_count', '-created_at')[:5]
        self.stdout.write(f"   Top 5 posts by views: {[p.title[:30] + '...' for p in ordered_posts]}")
        
        self.stdout.write('')

    def demonstrate_relationship_queries(self):
        self.stdout.write(self.style.WARNING('2. Relationship Queries:'))
        
        # Select related to avoid N+1 queries
        posts_with_authors = Post.objects.select_related('author', 'category').filter(status='published')[:3]
        for post in posts_with_authors:
            self.stdout.write(f"   Post: {post.title[:30]}... by {post.author.username} in {post.category.name if post.category else 'No Category'}")
        
        # Prefetch related for many-to-many
        posts_with_tags = Post.objects.prefetch_related('post_tags__tag').filter(status='published')[:3]
        for post in posts_with_tags:
            tags = [pt.tag.name for pt in post.post_tags.all()]
            self.stdout.write(f"   Post: {post.title[:30]}... with tags: {', '.join(tags[:3])}")
        
        # Reverse foreign key relationships
        user = User.objects.first()
        user_posts = user.posts.filter(status='published').count()
        user_comments = user.comments.filter(is_approved=True).count()
        self.stdout.write(f"   User {user.username}: {user_posts} posts, {user_comments} comments")
        
        self.stdout.write('')

    def demonstrate_aggregation_queries(self):
        self.stdout.write(self.style.WARNING('3. Aggregation Queries:'))
        
        # Count posts by status
        status_counts = Post.objects.values('status').annotate(count=Count('id'))
        for status in status_counts:
            self.stdout.write(f"   {status['status']}: {status['count']} posts")
        
        # Average view count by category
        category_stats = Post.objects.filter(status='published').values('category__name').annotate(
            avg_views=Avg('view_count'),
            total_posts=Count('id'),
            max_views=Max('view_count')
        ).order_by('-avg_views')
        
        for stat in category_stats[:3]:
            self.stdout.write(f"   Category {stat['category__name']}: {stat['total_posts']} posts, avg {stat['avg_views']:.1f} views, max {stat['max_views']} views")
        
        # User activity statistics
        user_stats = User.objects.annotate(
            post_count=Count('posts'),
            comment_count=Count('comments'),
            like_count=Count('post_likes')
        ).filter(post_count__gt=0).order_by('-post_count')[:3]
        
        for user in user_stats:
            self.stdout.write(f"   User {user.username}: {user.post_count} posts, {user.comment_count} comments, {user.like_count} likes")
        
        self.stdout.write('')

    def demonstrate_custom_manager_queries(self):
        self.stdout.write(self.style.WARNING('4. Custom Manager Queries:'))
        
        # Using custom manager
        published_posts = Post.published.all()
        self.stdout.write(f"   Published posts (via custom manager): {published_posts.count()}")
        
        # Featured published posts
        featured_posts = Post.published.featured()
        self.stdout.write(f"   Featured published posts: {featured_posts.count()}")
        
        # Recent published posts
        recent_published = Post.published.recent(days=30)
        self.stdout.write(f"   Published posts from last 30 days: {recent_published.count()}")
        
        # Posts by category using custom manager
        if Category.objects.exists():
            category = Category.objects.first()
            category_posts = Post.published.by_category(category)
            self.stdout.write(f"   Published posts in '{category.name}': {category_posts.count()}")
        
        self.stdout.write('')

    def demonstrate_complex_queries(self):
        self.stdout.write(self.style.WARNING('5. Complex Queries with Q Objects:'))
        
        # Complex filtering with Q objects
        complex_posts = Post.objects.filter(
            Q(status='published') & 
            (Q(view_count__gte=50) | Q(like_count__gte=10)) &
            Q(created_at__gte=timezone.now() - timedelta(days=30))
        )
        self.stdout.write(f"   Complex query result: {complex_posts.count()} posts")
        
        # Exclude certain posts
        excluded_posts = Post.objects.exclude(
            Q(status='draft')
        )
        self.stdout.write(f"   Posts excluding drafts and spam: {excluded_posts.count()}")
        
        # Annotate with calculated fields
        posts_with_engagement = Post.objects.filter(status='published').annotate(
            approved_comments=Count('comments', filter=Q(comments__is_approved=True)),
            total_engagement=F('view_count') + F('like_count') * 2 + F('approved_comments') * 3
        ).order_by('-total_engagement')[:3]
        
        for post in posts_with_engagement:
            self.stdout.write(f"   Post: {post.title[:30]}... (engagement: {post.total_engagement})")
        
        self.stdout.write('')

    def demonstrate_model_methods(self):
        self.stdout.write(self.style.WARNING('6. Model Methods and Properties:'))
        
        # Using model properties
        post = Post.objects.filter(status='published').first()
        if post:
            self.stdout.write(f"   Post: {post.title[:30]}...")
            self.stdout.write(f"   Is published: {post.is_published}")
            self.stdout.write(f"   Comment count: {post.comment_count}")
            
            # Using model methods
            self.stdout.write(f"   View count before: {post.view_count}")
            # Note: In real usage, you'd call increment_view_count() here
            self.stdout.write(f"   View count after increment: {post.view_count}")
        
        # User profile methods
        user_profile = UserProfile.objects.first()
        if user_profile:
            self.stdout.write(f"   User: {user_profile.user.username}")
            self.stdout.write(f"   Age: {user_profile.get_age()}")
            self.stdout.write(f"   Is verified: {user_profile.is_verified}")
        
        # Comment properties
        comment = Comment.objects.filter(is_approved=True).first()
        if comment:
            self.stdout.write(f"   Comment: {comment.content[:50]}...")
            self.stdout.write(f"   Is reply: {comment.is_reply}")
            self.stdout.write(f"   Reply count: {comment.reply_count}")
        
        self.stdout.write('')

    def demonstrate_advanced_features(self):
        self.stdout.write(self.style.WARNING('7. Advanced ORM Features:'))
        
        # Using F expressions for updates
        Post.objects.filter(status='published').update(
            view_count=F('view_count') + 1
        )
        self.stdout.write("   Updated view counts using F expressions")
        
        # Bulk operations
        from django.db import transaction
        
        with transaction.atomic():
            # Bulk create (example)
            new_tags = [
                Tag(name=f'Tag {i}', slug=f'tag-{i}')
                for i in range(5, 8)
            ]
            Tag.objects.bulk_create(new_tags, ignore_conflicts=True)
            self.stdout.write("   Bulk created tags")
        
        # Raw SQL queries
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT p.title, COUNT(c.id) as comment_count
                FROM posts p
                LEFT JOIN comments c ON p.id = c.post_id AND c.is_approved = 1
                WHERE p.status = 'published'
                GROUP BY p.id, p.title
                ORDER BY comment_count DESC
                LIMIT 3
            """)
            results = cursor.fetchall()
            self.stdout.write("   Raw SQL query results:")
            for title, count in results:
                self.stdout.write(f"     {title[:30]}...: {count} comments")
        
        self.stdout.write('')
