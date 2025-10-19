# Django Order Model for QueryFlow Testing
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from decimal import Decimal
import uuid

class Order(models.Model):
    """
    Django Order Model with comprehensive fields and relationships
    for testing QueryFlow database extraction capabilities
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
        ('apple_pay', 'Apple Pay'),
        ('google_pay', 'Google Pay'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        'User', 
        on_delete=models.CASCADE, 
        related_name='orders',
        help_text="User who placed the order"
    )
    order_number = models.CharField(
        max_length=20, 
        unique=True, 
        default=lambda: f"ORD-{uuid.uuid4().hex[:8].upper()}",
        help_text="Unique order identifier"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text="Current order status"
    )
    subtotal = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Subtotal before tax and shipping"
    )
    tax_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Tax amount"
    )
    shipping_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Shipping cost"
    )
    discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Discount amount applied"
    )
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total amount including tax and shipping"
    )
    payment_method = models.CharField(
        max_length=30, 
        choices=PAYMENT_METHOD_CHOICES,
        null=True, 
        blank=True,
        help_text="Payment method used"
    )
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending',
        help_text="Payment status"
    )
    shipping_address = models.TextField(
        null=True, 
        blank=True,
        help_text="Shipping address"
    )
    billing_address = models.TextField(
        null=True, 
        blank=True,
        help_text="Billing address"
    )
    notes = models.TextField(
        null=True, 
        blank=True,
        help_text="Order notes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['order_number']),
            models.Index(fields=['payment_status']),
        ]
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'

    def __str__(self):
        return f"Order {self.order_number} - {self.user.username if self.user else 'Unknown'}"

    @property
    def is_paid(self):
        """Check if order is paid"""
        return self.payment_status == 'paid'

    @property
    def is_shipped(self):
        """Check if order has been shipped"""
        return self.status in ['shipped', 'delivered']

    @property
    def is_delivered(self):
        """Check if order has been delivered"""
        return self.status == 'delivered'

    @property
    def is_cancelled(self):
        """Check if order is cancelled"""
        return self.status in ['cancelled', 'refunded']

    @property
    def total_items(self):
        """Get total number of items in the order"""
        return sum(item.quantity for item in self.order_items.all())

    @property
    def total_weight(self):
        """Calculate total weight of all items"""
        total = Decimal('0.00')
        for item in self.order_items.all():
            if item.product and item.product.weight:
                total += item.product.weight * item.quantity
        return total

    def calculate_totals(self):
        """Calculate and update order totals"""
        self.subtotal = sum(item.total_price for item in self.order_items.all())
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_amount - self.discount_amount
        self.save(update_fields=['subtotal', 'total_amount'])

    def can_be_cancelled(self):
        """Check if order can be cancelled"""
        return self.status in ['pending', 'processing']

    def can_be_refunded(self):
        """Check if order can be refunded"""
        return self.status in ['delivered', 'shipped'] and self.payment_status == 'paid'

    def mark_as_shipped(self):
        """Mark order as shipped"""
        if self.status == 'processing':
            self.status = 'shipped'
            self.shipped_at = timezone.now()
            self.save(update_fields=['status', 'shipped_at'])

    def mark_as_delivered(self):
        """Mark order as delivered"""
        if self.status == 'shipped':
            self.status = 'delivered'
            self.delivered_at = timezone.now()
            self.save(update_fields=['status', 'delivered_at'])

    def cancel(self, reason=None):
        """Cancel the order"""
        if self.can_be_cancelled():
            self.status = 'cancelled'
            if reason:
                self.notes = f"{self.notes or ''}\nCancellation reason: {reason}".strip()
            self.save(update_fields=['status', 'notes'])

    @classmethod
    def get_orders_by_status(cls, status):
        """Get orders by status"""
        return cls.objects.filter(status=status)

    @classmethod
    def get_orders_by_user(cls, user):
        """Get orders for a specific user"""
        return cls.objects.filter(user=user)

    @classmethod
    def get_recent_orders(cls, days=30):
        """Get recent orders within specified days"""
        from django.utils import timezone
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days)
        return cls.objects.filter(created_at__gte=cutoff_date)

    @classmethod
    def get_high_value_orders(cls, min_amount=1000):
        """Get high value orders"""
        return cls.objects.filter(total_amount__gte=min_amount)

    def clean(self):
        """Validate the model"""
        from django.core.exceptions import ValidationError
        
        if self.total_amount < 0:
            raise ValidationError('Total amount cannot be negative')
        
        if self.subtotal < 0:
            raise ValidationError('Subtotal cannot be negative')
        
        if self.tax_amount < 0:
            raise ValidationError('Tax amount cannot be negative')
        
        if self.shipping_amount < 0:
            raise ValidationError('Shipping amount cannot be negative')
        
        if self.discount_amount < 0:
            raise ValidationError('Discount amount cannot be negative')
