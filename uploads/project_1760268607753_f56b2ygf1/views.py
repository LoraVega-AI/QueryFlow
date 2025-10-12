from django.http import JsonResponse

def users_list(request):
    return JsonResponse({'message': 'users endpoint'})
