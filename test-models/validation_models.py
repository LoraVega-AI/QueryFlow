from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, EmailValidator
from django.core.exceptions import ValidationError
import re

def validate_even(value):
    if value % 2 != 0:
        raise ValidationError('%(value)s is not an even number', params={'value': value})

class Product(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Product name")
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(
        max_length=20, 
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{2}-\d{6}$',
                message='SKU must be in format XX-123456'
            )
        ]
    )
    weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0.01), MaxValueValidator(1000)]
    )
    is_active = models.BooleanField(default=True)
    even_field = models.IntegerField(validators=[validate_even])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['-created_at']
        unique_together = [('name', 'sku')]
        index_together = [('name', 'price')]
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gt=0),
                name='price_gt_0'
            ),
            models.UniqueConstraint(
                fields=['name', 'sku'],
                name='unique_name_sku'
            )
        ]
    
    def clean_sku(self):
        sku = self.sku
        if not re.match(r'^[A-Z]{2}-\d{6}$', sku):
            raise ValidationError('SKU must be in format XX-123456')
        return sku
    
    def clean(self):
        if self.price > 1000 and self.stock < 10:
            raise ValidationError('Expensive products must have at least 10 in stock')
        if self.name == self.description:
            raise ValidationError('Name and description cannot be the same')
    
    def __str__(self):
        return self.name

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    order_number = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    customer_email = models.EmailField(validators=[EmailValidator()])
    total = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    billing_address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=0),
                name='total_gte_0'
            )
        ]
    
    def clean_customer_email(self):
        email = self.customer_email
        if email.endswith('.test'):
            raise ValidationError('Test emails are not allowed')
        return email
    
    def clean(self):
        if self.shipping_address == self.billing_address:
            # This is just a warning, not an error
            pass
        if self.status == 'cancelled' and self.total > 0:
            raise ValidationError('Cancelled orders should have zero total')
