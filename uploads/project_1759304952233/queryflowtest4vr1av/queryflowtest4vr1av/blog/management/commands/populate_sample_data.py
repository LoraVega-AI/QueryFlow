from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random
from blog.models import UserProfile, Category, Post, Comment, Tag, PostTag, PostLike


class Command(BaseCommand):
    help = 'Populate database with sample data (50+ rows)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of users to create'
        )
        parser.add_argument(
            '--posts',
            type=int,
            default=20,
            help='Number of posts to create'
        )
        parser.add_argument(
            '--comments',
            type=int,
            default=30,
            help='Number of comments to create'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to populate sample data...'))
        
        # Create users
        self.create_users(options['users'])
        
        # Create categories
        self.create_categories()
        
        # Create tags
        self.create_tags()
        
        # Create posts
        self.create_posts(options['posts'])
        
        # Create comments
        self.create_comments(options['comments'])
        
        # Create likes
        self.create_likes()
        
        self.stdout.write(self.style.SUCCESS('Sample data population completed!'))

    def create_users(self, count):
        self.stdout.write('Creating users...')
        users_data = [
            ('john_doe', 'john@example.com', 'John', 'Doe'),
            ('jane_smith', 'jane@example.com', 'Jane', 'Smith'),
            ('bob_wilson', 'bob@example.com', 'Bob', 'Wilson'),
            ('alice_brown', 'alice@example.com', 'Alice', 'Brown'),
            ('charlie_davis', 'charlie@example.com', 'Charlie', 'Davis'),
            ('diana_miller', 'diana@example.com', 'Diana', 'Miller'),
            ('eve_jones', 'eve@example.com', 'Eve', 'Jones'),
            ('frank_garcia', 'frank@example.com', 'Frank', 'Garcia'),
            ('grace_lee', 'grace@example.com', 'Grace', 'Lee'),
            ('henry_taylor', 'henry@example.com', 'Henry', 'Taylor'),
        ]
        
        for i in range(count):
            if i < len(users_data):
                username, email, first_name, last_name = users_data[i]
            else:
                username = f'user_{i+1}'
                email = f'user{i+1}@example.com'
                first_name = f'User{i+1}'
                last_name = 'LastName'
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_active': True,
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                
                # Create user profile
                UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'bio': f'This is the bio for {first_name} {last_name}. I love writing and sharing my thoughts with the world.',
                        'location': random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose']),
                        'website': f'https://{username}.com' if random.choice([True, False]) else '',
                        'is_verified': random.choice([True, False]),
                    }
                )

    def create_categories(self):
        self.stdout.write('Creating categories...')
        categories_data = [
            ('Technology', 'tech', 'Latest technology trends and innovations', '#007bff'),
            ('Programming', 'programming', 'Programming tutorials and tips', '#28a745'),
            ('Web Development', 'web-dev', 'Web development articles and guides', '#ffc107'),
            ('Data Science', 'data-science', 'Data science and machine learning', '#dc3545'),
            ('Mobile Development', 'mobile-dev', 'Mobile app development', '#6f42c1'),
            ('DevOps', 'devops', 'DevOps practices and tools', '#fd7e14'),
            ('Design', 'design', 'UI/UX design and graphics', '#e83e8c'),
            ('Business', 'business', 'Business and entrepreneurship', '#20c997'),
        ]
        
        for name, slug, description, color in categories_data:
            Category.objects.get_or_create(
                name=name,
                defaults={
                    'slug': slug,
                    'description': description,
                    'color': color,
                    'is_active': True,
                }
            )

    def create_tags(self):
        self.stdout.write('Creating tags...')
        tags_data = [
            ('Python', 'python', 'Python programming language', '#3776ab'),
            ('JavaScript', 'javascript', 'JavaScript programming', '#f7df1e'),
            ('React', 'react', 'React library for building user interfaces', '#61dafb'),
            ('Django', 'django', 'Django web framework', '#092e20'),
            ('SQL', 'sql', 'Structured Query Language', '#336791'),
            ('API', 'api', 'Application Programming Interface', '#ff6b6b'),
            ('Database', 'database', 'Database design and management', '#4ecdc4'),
            ('Tutorial', 'tutorial', 'Step-by-step learning guides', '#45b7d1'),
            ('Best Practices', 'best-practices', 'Industry best practices', '#96ceb4'),
            ('Performance', 'performance', 'Performance optimization', '#feca57'),
        ]
        
        for name, slug, description, color in tags_data:
            Tag.objects.get_or_create(
                name=name,
                defaults={
                    'slug': slug,
                    'description': description,
                    'color': color,
                }
            )

    def create_posts(self, count):
        self.stdout.write('Creating posts...')
        users = list(User.objects.all())
        categories = list(Category.objects.all())
        
        post_titles = [
            'Getting Started with Python Programming',
            'Building Modern Web Applications with React',
            'Database Design Best Practices',
            'Introduction to Machine Learning',
            'Django REST Framework Tutorial',
            'JavaScript ES6+ Features You Should Know',
            'Docker for Developers: A Complete Guide',
            'Understanding RESTful APIs',
            'CSS Grid vs Flexbox: When to Use What',
            'Git Workflow for Team Development',
            'Microservices Architecture Patterns',
            'Testing Strategies for Web Applications',
            'Performance Optimization Techniques',
            'Security Best Practices for Web Apps',
            'Cloud Computing with AWS',
            'Mobile App Development with React Native',
            'Data Visualization with D3.js',
            'Agile Development Methodologies',
            'Code Review Best Practices',
            'Continuous Integration and Deployment',
        ]
        
        for i in range(count):
            title = random.choice(post_titles) + f' - Part {i+1}'
            author = random.choice(users)
            category = random.choice(categories) if categories else None
            status = random.choice(['draft', 'published', 'published', 'published'])  # More published posts
            
            # Generate content
            content = self.generate_post_content(title)
            
            # Generate a proper slug
            import re
            slug_base = re.sub(r'[^a-zA-Z0-9\s-]', '', title.lower())
            slug_base = re.sub(r'\s+', '-', slug_base.strip())
            slug = f"{slug_base}-{i+1}"
            
            post = Post.objects.create(
                title=title,
                slug=slug,
                content=content,
                excerpt=content[:200] + '...' if len(content) > 200 else content,
                author=author,
                category=category,
                status=status,
                featured=random.choice([True, False, False, False]),  # 25% chance of being featured
                allow_comments=True,
                published_at=timezone.now() - timedelta(days=random.randint(0, 30)) if status == 'published' else None,
                view_count=random.randint(0, 1000),
                like_count=random.randint(0, 100),
                meta_title=title[:60],
                meta_description=content[:160],
                reading_time=random.randint(2, 15),
                is_featured=random.choice([True, False, False, False]),
            )
            
            # Add tags to post
            tags = random.sample(list(Tag.objects.all()), random.randint(1, 4))
            for tag in tags:
                PostTag.objects.get_or_create(post=post, tag=tag)

    def generate_post_content(self, title):
        """Generate realistic post content based on title"""
        content_templates = [
            f"""
            {title}
            
            In this comprehensive guide, we'll explore the fundamentals and advanced concepts that every developer should know.
            
            ## Introduction
            
            Getting started with any new technology can be overwhelming, but with the right approach and resources, you can master it quickly. This article will provide you with a solid foundation and practical examples.
            
            ## Key Concepts
            
            Let's dive into the core concepts:
            
            1. **Fundamentals**: Understanding the basics is crucial for building a strong foundation.
            2. **Best Practices**: Following industry standards will make your code more maintainable.
            3. **Common Pitfalls**: Learning from common mistakes will save you time and frustration.
            4. **Advanced Topics**: Once you're comfortable with the basics, explore advanced features.
            
            ## Practical Examples
            
            Here's a simple example to get you started:
            
            ```python
            def hello_world():
                print("Hello, World!")
                return "Success"
            
            if __name__ == "__main__":
                result = hello_world()
                print(f"Result: {{result}}")
            ```
            
            ## Conclusion
            
            This guide has covered the essential concepts you need to know. Practice regularly and don't be afraid to experiment with different approaches.
            
            ## Additional Resources
            
            - Official Documentation
            - Community Forums
            - Video Tutorials
            - Practice Projects
            
            Happy coding!
            """,
            
            f"""
            {title}
            
            Welcome to this in-depth tutorial where we'll cover everything you need to know about this topic.
            
            ## Why This Matters
            
            Understanding this concept is essential for modern development. It provides numerous benefits including improved performance, better maintainability, and enhanced user experience.
            
            ## Step-by-Step Implementation
            
            ### Step 1: Setup
            First, let's set up our development environment with the necessary tools and dependencies.
            
            ### Step 2: Configuration
            Configure your project settings according to your specific requirements.
            
            ### Step 3: Implementation
            Implement the core functionality with clean, readable code.
            
            ### Step 4: Testing
            Write comprehensive tests to ensure your implementation works correctly.
            
            ### Step 5: Deployment
            Deploy your application to a production environment.
            
            ## Common Challenges and Solutions
            
            Here are some common issues you might encounter and how to solve them:
            
            - **Issue 1**: Description of the problem and solution
            - **Issue 2**: Another common problem with its solution
            - **Issue 3**: Performance considerations and optimizations
            
            ## Best Practices
            
            Follow these best practices for optimal results:
            
            1. Write clean, self-documenting code
            2. Use version control effectively
            3. Implement proper error handling
            4. Follow security guidelines
            5. Optimize for performance
            
            ## Next Steps
            
            Now that you've learned the basics, consider these next steps:
            
            - Explore advanced features
            - Build a real-world project
            - Contribute to open source
            - Share your knowledge with others
            
            Keep learning and building amazing things!
            """
        ]
        
        return random.choice(content_templates)

    def create_comments(self, count):
        self.stdout.write('Creating comments...')
        users = list(User.objects.all())
        posts = list(Post.objects.filter(status='published'))
        
        comment_templates = [
            "Great article! This really helped me understand the concept better.",
            "Thanks for sharing this. I've been looking for a solution like this.",
            "Excellent explanation. Could you provide more examples?",
            "This is exactly what I needed. Keep up the good work!",
            "Very informative post. I learned a lot from this.",
            "I have a question about the implementation. Can you clarify?",
            "Amazing tutorial! I followed along and it worked perfectly.",
            "This is a game-changer for my project. Thank you!",
            "I disagree with some points, but overall it's a good read.",
            "Perfect timing! I was just working on something similar.",
            "Could you write a follow-up post about advanced topics?",
            "I've bookmarked this for future reference. Great content!",
            "This cleared up a lot of confusion I had. Much appreciated!",
            "I'm new to this topic and this was very helpful.",
            "Excellent work! Looking forward to more content like this.",
        ]
        
        for i in range(count):
            if not posts:
                break
                
            post = random.choice(posts)
            author = random.choice(users)
            content = random.choice(comment_templates)
            
            # Create some replies
            if random.choice([True, False, False]):  # 33% chance of being a reply
                parent_comments = list(Comment.objects.filter(post=post, parent__isnull=True))
                parent = random.choice(parent_comments) if parent_comments else None
            else:
                parent = None
            
            Comment.objects.create(
                post=post,
                author=author,
                parent=parent,
                content=content,
                is_approved=random.choice([True, True, True, False]),  # 75% approved
                is_spam=random.choice([False, False, False, True]),  # 25% spam
                ip_address=f"192.168.1.{random.randint(1, 254)}",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            )

    def create_likes(self):
        self.stdout.write('Creating likes...')
        users = list(User.objects.all())
        posts = list(Post.objects.filter(status='published'))
        
        # Create likes for posts
        for post in posts:
            # Random number of users who liked this post
            num_likes = random.randint(0, min(10, len(users)))
            likers = random.sample(users, num_likes)
            
            for user in likers:
                PostLike.objects.get_or_create(
                    post=post,
                    user=user,
                    defaults={'created_at': timezone.now() - timedelta(days=random.randint(0, 30))}
                )
