# Django Review Model for QueryFlow Testing
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from decimal import Decimal
import uuid

class Review(models.Model):
    """
    Django Review Model with comprehensive fields and relationships
    for testing QueryFlow database extraction capabilities
    """
    
    RATING_CHOICES = [
        (1, '1 Star - Poor'),
        (2, '2 Stars - Fair'),
        (3, '3 Stars - Good'),
        (4, '4 Stars - Very Good'),
        (5, '5 Stars - Excellent'),
    ]

    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        'Product', 
        on_delete=models.CASCADE, 
        related_name='reviews',
        help_text="Product being reviewed"
    )
    user = models.ForeignKey(
        'User', 
        on_delete=models.CASCADE, 
        related_name='reviews',
        help_text="User who wrote the review"
    )
    rating = models.IntegerField(
        choices=RATING_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    title = models.CharField(
        max_length=200, 
        null=True, 
        blank=True,
        help_text="Review title"
    )
    comment = models.TextField(
        null=True, 
        blank=True,
        help_text="Detailed review comment"
    )
    is_verified_purchase = models.BooleanField(
        default=False,
        help_text="Whether this is a verified purchase review"
    )
    is_approved = models.BooleanField(
        default=False,
        help_text="Whether this review has been approved for display"
    )
    helpful_votes = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of helpful votes received"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'rating']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['is_approved']),
            models.Index(fields=['is_verified_purchase']),
            models.Index(fields=['rating', 'is_approved']),
        ]
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        # Ensure one review per user per product
        unique_together = ['product', 'user']

    def __str__(self):
        return f"Review by {self.user.username if self.user else 'Unknown'} for {self.product.name if self.product else 'Unknown Product'} - {self.rating} stars"

    @property
    def is_positive(self):
        """Check if review is positive (4+ stars)"""
        return self.rating >= 4

    @property
    def is_negative(self):
        """Check if review is negative (2 or fewer stars)"""
        return self.rating <= 2

    @property
    def is_neutral(self):
        """Check if review is neutral (3 stars)"""
        return self.rating == 3

    @property
    def helpfulness_score(self):
        """Calculate helpfulness score based on votes"""
        if self.helpful_votes == 0:
            return 0
        # Simple helpfulness calculation (could be more sophisticated)
        return min(self.helpful_votes / 10, 1.0)

    @property
    def display_title(self):
        """Get display title or generate one"""
        if self.title:
            return self.title
        return f"{self.rating} star review"

    def mark_as_helpful(self):
        """Increment helpful votes"""
        self.helpful_votes += 1
        self.save(update_fields=['helpful_votes'])

    def approve(self):
        """Approve the review for display"""
        self.is_approved = True
        self.save(update_fields=['is_approved'])

    def reject(self):
        """Reject the review (unapprove)"""
        self.is_approved = False
        self.save(update_fields=['is_approved'])

    def verify_purchase(self):
        """Mark as verified purchase"""
        self.is_verified_purchase = True
        self.save(update_fields=['is_verified_purchase'])

    @classmethod
    def get_approved_reviews(cls):
        """Get all approved reviews"""
        return cls.objects.filter(is_approved=True)

    @classmethod
    def get_verified_reviews(cls):
        """Get all verified purchase reviews"""
        return cls.objects.filter(is_verified_purchase=True)

    @classmethod
    def get_reviews_by_rating(cls, rating):
        """Get reviews by specific rating"""
        return cls.objects.filter(rating=rating, is_approved=True)

    @classmethod
    def get_positive_reviews(cls):
        """Get positive reviews (4+ stars)"""
        return cls.objects.filter(rating__gte=4, is_approved=True)

    @classmethod
    def get_negative_reviews(cls):
        """Get negative reviews (2 or fewer stars)"""
        return cls.objects.filter(rating__lte=2, is_approved=True)

    @classmethod
    def get_reviews_for_product(cls, product_id):
        """Get all approved reviews for a specific product"""
        return cls.objects.filter(
            product_id=product_id, 
            is_approved=True
        ).order_by('-created_at')

    @classmethod
    def get_reviews_by_user(cls, user_id):
        """Get all reviews by a specific user"""
        return cls.objects.filter(user_id=user_id).order_by('-created_at')

    @classmethod
    def get_helpful_reviews(cls, min_votes=5):
        """Get reviews with minimum helpful votes"""
        return cls.objects.filter(
            helpful_votes__gte=min_votes,
            is_approved=True
        ).order_by('-helpful_votes')

    @classmethod
    def get_recent_reviews(cls, days=30):
        """Get recent reviews within specified days"""
        from django.utils import timezone
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days)
        return cls.objects.filter(
            created_at__gte=cutoff_date,
            is_approved=True
        ).order_by('-created_at')

    @classmethod
    def get_average_rating_for_product(cls, product_id):
        """Get average rating for a specific product"""
        from django.db.models import Avg
        result = cls.objects.filter(
            product_id=product_id,
            is_approved=True
        ).aggregate(avg_rating=Avg('rating'))
        return result['avg_rating'] or 0

    @classmethod
    def get_rating_distribution_for_product(cls, product_id):
        """Get rating distribution for a specific product"""
        from django.db.models import Count
        return cls.objects.filter(
            product_id=product_id,
            is_approved=True
        ).values('rating').annotate(count=Count('rating')).order_by('rating')

    def clean(self):
        """Validate the model"""
        from django.core.exceptions import ValidationError
        
        if self.rating < 1 or self.rating > 5:
            raise ValidationError('Rating must be between 1 and 5')
        
        if self.helpful_votes < 0:
            raise ValidationError('Helpful votes cannot be negative')
        
        if self.title and len(self.title) > 200:
            raise ValidationError('Title cannot exceed 200 characters')
