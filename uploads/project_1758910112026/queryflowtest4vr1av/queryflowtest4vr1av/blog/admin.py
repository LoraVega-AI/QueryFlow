from django.contrib import admin
from django.utils.html import format_html
from .models import UserProfile, Category, Post, Comment, Tag, PostTag, PostLike


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_verified', 'location', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['user__username', 'user__email', 'location']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'post_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at']
    
    def post_count(self, obj):
        return obj.posts.count()
    post_count.short_description = 'Posts'


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'status', 'featured', 'view_count', 'like_count', 'created_at']
    list_filter = ['status', 'featured', 'category', 'created_at', 'published_at']
    search_fields = ['title', 'content', 'author__username']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['uuid', 'created_at', 'updated_at', 'view_count', 'like_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'content', 'excerpt', 'author', 'category')
        }),
        ('Status & Settings', {
            'fields': ('status', 'featured', 'allow_comments', 'published_at')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('view_count', 'like_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('uuid', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'post', 'is_approved', 'is_spam', 'created_at']
    list_filter = ['is_approved', 'is_spam', 'created_at']
    search_fields = ['content', 'author__username', 'post__title']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    
    actions = ['approve_comments', 'mark_as_spam']
    
    def approve_comments(self, request, queryset):
        queryset.update(is_approved=True)
        self.message_user(request, f"{queryset.count()} comments approved.")
    approve_comments.short_description = "Approve selected comments"
    
    def mark_as_spam(self, request, queryset):
        queryset.update(is_spam=True, is_approved=False)
        self.message_user(request, f"{queryset.count()} comments marked as spam.")
    mark_as_spam.short_description = "Mark selected comments as spam"


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'color_display', 'post_count', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at']
    
    def color_display(self, obj):
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            obj.color,
            obj.color
        )
    color_display.short_description = 'Color'
    
    def post_count(self, obj):
        return obj.post_tags.count()
    post_count.short_description = 'Posts'


@admin.register(PostTag)
class PostTagAdmin(admin.ModelAdmin):
    list_display = ['post', 'tag', 'created_at']
    list_filter = ['created_at']
    search_fields = ['post__title', 'tag__name']


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ['post', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['post__title', 'user__username']