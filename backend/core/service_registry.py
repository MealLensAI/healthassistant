"""
Service Registry for initializing and managing all application services.
This module handles the creation and registration of all services in the DI container.
"""
import logging
from typing import Optional
from config.settings import Config
from core.container import get_container
from services.supabase_service import SupabaseService
from services.auth_service import AuthService

logger = logging.getLogger(__name__)


def init_services(config: Config) -> bool:
    """
    Initialize all application services and register them in the container.
    
    Args:
        config: Application configuration
        
    Returns:
        True if all required services initialized successfully
    """
    container = get_container()
    
    try:
        # Initialize Supabase Service (Required)
        logger.info("Initializing Supabase service...")
        supabase_service = SupabaseService(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )
        container.register_singleton('supabase_service', supabase_service)
        logger.info("Supabase service initialized successfully")
        
        # Initialize Auth Service (Required)
        logger.info("Initializing Auth service...")
        auth_service = AuthService(supabase_service.supabase)
        container.register_singleton('auth_service', auth_service)
        logger.info("Auth service initialized successfully")
        
        # Initialize Payment Service (Optional)
        if config.PAYMENT_ENABLED:
            try:
                from services.payment_service import PaymentService
                logger.info("Initializing Payment service...")
                payment_service = PaymentService(supabase_service.supabase)
                container.register_singleton('payment_service', payment_service)
                logger.info("Payment service initialized successfully")
            except ImportError as e:
                logger.warning(f"Payment service not available: {e}")
            except Exception as e:
                logger.error(f"Failed to initialize Payment service: {e}")
        else:
            logger.info("Payment service disabled (no Paystack key)")
        
        # Initialize Subscription Service (Optional)
        try:
            from services.subscription_service import SubscriptionService
            logger.info("Initializing Subscription service...")
            # Use centralized Supabase client
            subscription_service = SubscriptionService(supabase_service.supabase)
            container.register_singleton('subscription_service', subscription_service)
            logger.info("Subscription service initialized successfully")
        except ImportError as e:
            logger.warning(f"Subscription service not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize Subscription service: {e}")
        
        # Initialize Lifecycle Subscription Service (Optional)
        try:
            from services.lifecycle_subscription_service import LifecycleSubscriptionService
            logger.info("Initializing Lifecycle Subscription service...")
            # Use centralized Supabase client
            lifecycle_service = LifecycleSubscriptionService(supabase_service.supabase)
            container.register_singleton('lifecycle_service', lifecycle_service)
            logger.info("Lifecycle Subscription service initialized successfully")
        except ImportError as e:
            logger.warning(f"Lifecycle Subscription service not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize Lifecycle Subscription service: {e}")
        
        # Initialize Email Service (Optional)
        if config.EMAIL_ENABLED:
            try:
                from services.email_service import EmailService
                logger.info("Initializing Email service...")
                # EmailService loads config from environment variables
                email_service = EmailService()
                container.register_singleton('email_service', email_service)
                logger.info("Email service initialized successfully")
            except ImportError as e:
                logger.warning(f"Email service not available: {e}")
            except Exception as e:
                logger.error(f"Failed to initialize Email service: {e}")
        else:
            logger.info("Email service disabled (no SMTP credentials)")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        return False


def get_service(service_name: str) -> Optional[any]:
    """
    Get a service from the container.
    
    Args:
        service_name: Name of the service to retrieve
        
    Returns:
        Service instance or None if not found
    """
    container = get_container()
    return container.get(service_name)
