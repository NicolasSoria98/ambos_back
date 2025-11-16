from django.urls import path
from .views import SearchTrendsView, GeoCodesView, SuggestionsView

urlpatterns = [
    path('trends/', SearchTrendsView.as_view(), name='search-trends'),
    path('geocodes/', GeoCodesView.as_view(), name='geocodes'),
    path('suggestions/', SuggestionsView.as_view(), name='suggestions'),
]