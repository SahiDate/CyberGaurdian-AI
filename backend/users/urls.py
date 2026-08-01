from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, VerifyRegistrationView, LoginInitiateView, VerifyLoginView

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/verify-registration/', VerifyRegistrationView.as_view(), name='verify_registration'),
    path('api/login/', LoginInitiateView.as_view(), name='login_initiate'),
    path('api/verify-login/', VerifyLoginView.as_view(), name='verify_login'),
]
