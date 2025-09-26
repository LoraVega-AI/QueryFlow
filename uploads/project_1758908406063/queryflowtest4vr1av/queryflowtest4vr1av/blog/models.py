from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator, MaxLengthValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q, F, Count, Sum
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
import uuid


class UserProfile(models.Model):
    """
    Extended user profile with additional fields and constraints
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True, null=True)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(
        max_length=15,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )],
        unique=True,
        null=True,
        blank=True
    )
    website = models.URLField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['phone']),
            models.Index(fields=['is_verified']),
        ]
        constraints = []
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def clean(self):
        if self.birth_date and self.birth_date > timezone.now().date():
            raise ValidationError({'birth_date': 'Birth date cannot be in the future.'})
    
    def get_age(self):
        if self.birth_date:
            today = timezone.now().date()
            return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        return None


class Category(models.Model):
    """
    Blog post categories
    """
    name = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(max_length=60, unique=True, db_index=True)
    description = models.TextField(max_length=200, blank=True)
    color = models.CharField(
        max_length=7,
        validators=[RegexValidator(
            regex=r'^#[0-9A-Fa-f]{6}$',
            message="Color must be a valid hex color code (e.g., #FF0000)"
        )],
        default='#007bff'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
        constraints = []
    
    def __str__(self):
        return self.name


class Post(models.Model):
    """
    Blog posts with comprehensive constraints and relationships
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    # Primary key with auto-increment (Django default)
    id = models.AutoField(primary_key=True)
    
    # UUID for external references
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    
    title = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(5), MaxLengthValidator(200)],
        db_index=True
    )
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    content = models.TextField(
        validators=[MinLengthValidator(50)],
        help_text="Post content must be at least 50 characters long"
    )
    excerpt = models.TextField(max_length=300, blank=True)
    
    # Foreign key relationships
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='posts')
    
    # Status and metadata
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft', db_index=True)
    featured = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # View count and engagement
    view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    
    # SEO fields
    meta_title = models.CharField(max_length=60, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    
    # Additional fields for demonstration
    reading_time = models.PositiveIntegerField(default=0, help_text="Estimated reading time in minutes")
    is_featured = models.BooleanField(default=False, help_text="Featured post on homepage")
    
    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['author', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['published_at']),
            models.Index(fields=['featured', 'status']),
            models.Index(fields=['created_at', 'status']),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(status__in=['draft', 'published', 'archived']),
                name='post_status_valid'
            ),
            models.CheckConstraint(
                check=Q(published_at__isnull=True) | Q(status='published'),
                name='published_at_requires_published_status'
            ),
        ]
    
    def __str__(self):
        return self.title
    
    def clean(self):
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        if self.status != 'published' and self.published_at:
            self.published_at = None
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_published(self):
        return self.status == 'published' and self.published_at is not None
    
    @property
    def comment_count(self):
        return self.comments.filter(is_approved=True).count()
    
    def increment_view_count(self):
        self.view_count = F('view_count') + 1
        self.save(update_fields=['view_count'])


class Comment(models.Model):
    """
    Comments on blog posts with moderation features
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    content = models.TextField(
        max_length=1000,
        validators=[MinLengthValidator(10), MaxLengthValidator(1000)]
    )
    
    # Moderation fields
    is_approved = models.BooleanField(default=False, db_index=True)
    is_spam = models.BooleanField(default=False)
    moderation_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # IP and user agent for spam detection
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['post', 'is_approved']),
            models.Index(fields=['author', 'created_at']),
            models.Index(fields=['parent']),
            models.Index(fields=['is_spam', 'is_approved']),
        ]
        constraints = []
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"
    
    def clean(self):
        if self.parent and self.parent.post != self.post:
            raise ValidationError('Parent comment must be on the same post.')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        if self.is_approved and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)
    
    @property
    def is_reply(self):
        return self.parent is not None
    
    @property
    def reply_count(self):
        return self.replies.filter(is_approved=True).count()


class Tag(models.Model):
    """
    Tags for posts
    """
    name = models.CharField(max_length=30, unique=True, db_index=True)
    slug = models.SlugField(max_length=35, unique=True, db_index=True)
    description = models.TextField(max_length=150, blank=True)
    color = models.CharField(
        max_length=7,
        validators=[RegexValidator(
            regex=r'^#[0-9A-Fa-f]{6}$',
            message="Color must be a valid hex color code"
        )],
        default='#6c757d'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tags'
        ordering = ['name']
        constraints = []
    
    def __str__(self):
        return self.name


class PostTag(models.Model):
    """
    Many-to-many relationship between posts and tags
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='post_tags')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_tags'
        unique_together = ['post', 'tag']
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['tag']),
        ]


class PostLike(models.Model):
    """
    Post likes tracking
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_likes'
        unique_together = ['post', 'user']
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user']),
        ]


# Custom Manager for Post model
class PublishedPostManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published', published_at__isnull=False)
    
    def featured(self):
        return self.filter(featured=True)
    
    def by_category(self, category):
        return self.filter(category=category)
    
    def recent(self, days=30):
        from datetime import timedelta
        since = timezone.now() - timedelta(days=days)
        return self.filter(published_at__gte=since)


# Add custom manager to Post model
Post.add_to_class('published', PublishedPostManager())


# Signal handlers
@receiver(post_save, sender=Post)
def update_post_like_count(sender, instance, **kwargs):
    """Update like count when PostLike objects are created/deleted"""
    instance.like_count = instance.likes.count()
    Post.objects.filter(pk=instance.pk).update(like_count=instance.like_count)


@receiver(post_save, sender=Comment)
def update_comment_approval_time(sender, instance, created, **kwargs):
    """Set approval time when comment is approved"""
    if instance.is_approved and not instance.approved_at:
        instance.approved_at = timezone.now()
        instance.save(update_fields=['approved_at'])


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create user profile when user is created"""
    if created:
        UserProfile.objects.create(user=instance)